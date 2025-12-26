/**
 * Conventional CMA-ES Implementation
 *
 * This implements the standard CMA-ES algorithm with:
 * - Cumulative step-size adaptation (CSA)
 * - Evolution paths (pσ and pc)
 * - Rank-μ and rank-one covariance updates
 * - Eigendecomposition for sampling
 *
 * Based on Hansen's "The CMA Evolution Strategy: A Tutorial"
 */

import { randn } from "./gaussian.js";

/**
 * Conventional CMA-ES optimizer
 *
 * @param {Object} options - Configuration options
 * @param {Array<number>} options.initialConfig - Initial solution (mean)
 * @param {Function} options.objectiveFunction - Function to MINIMIZE (unlike the custom variant)
 * @param {Function} options.shouldStop - Function that returns true when optimization should stop
 * @param {Function} options.onImprovement - Optional callback: (config, score) => void
 * @param {number} options.sigma - Initial step size (default: 0.5)
 * @param {number} options.lambda - Population size (default: 4 + floor(3*ln(n)))
 * @returns {Promise<{solution: Array<number>, fitness: number, generations: number, evaluations: number}>}
 */
export async function optimizeCMAESConventional(options) {
  const {
    initialConfig,
    objectiveFunction,
    shouldStop,
    onImprovement = null,
    sigma: initialSigma = 0.5,
    lambda: lambdaOverride = null,
  } = options;

  const n = initialConfig.length; // dimension

  // Strategy parameter setting: Selection
  const lambda = lambdaOverride || Math.floor(4 + 3 * Math.log(n)); // population size
  const mu = Math.floor(lambda / 2); // number of parents/selected points

  // Recombination weights
  const rawWeights = Array.from({ length: mu }, (_, i) => Math.log(mu + 0.5) - Math.log(i + 1));
  const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
  const weights = rawWeights.map(w => w / sumWeights); // normalize
  const mueff = 1 / weights.reduce((sum, w) => sum + w * w, 0); // variance-effective size of mu

  // Strategy parameter setting: Adaptation
  const cc = (4 + mueff / n) / (n + 4 + 2 * mueff / n); // time constant for cumulation for C
  const cs = (mueff + 2) / (n + mueff + 5); // time constant for cumulation for sigma
  const c1 = 2 / ((n + 1.3) ** 2 + mueff); // learning rate for rank-one update
  const cmu = Math.min(1 - c1, 2 * (mueff - 2 + 1 / mueff) / ((n + 2) ** 2 + mueff)); // learning rate for rank-mu update
  const damps = 1 + 2 * Math.max(0, Math.sqrt((mueff - 1) / (n + 1)) - 1) + cs; // damping for sigma
  const chiN = Math.sqrt(n) * (1 - 1 / (4 * n) + 1 / (21 * n * n)); // expectation of ||N(0,I)||

  // Initialize dynamic strategy parameters
  let mean = [...initialConfig];
  let sigma = initialSigma;
  let pc = Array(n).fill(0); // evolution path for C
  let ps = Array(n).fill(0); // evolution path for sigma
  let B = identity(n); // coordinate system (eigenvectors)
  let D = Array(n).fill(1); // scaling (sqrt of eigenvalues)
  let C = identity(n); // covariance matrix
  let invsqrtC = identity(n); // C^(-1/2)

  let eigeneval = 0; // track evaluations for eigendecomposition
  let counteval = 0;
  let generation = 0;
  let bestEver = { x: [...mean], fitness: Infinity };

  while (!shouldStop()) {
    generation++;

    // Generate and evaluate lambda offspring
    const arx = []; // offspring solutions
    const arfitness = []; // fitness values

    for (let k = 0; k < lambda; k++) {
      // Sample: x = mean + sigma * B * D * z, where z ~ N(0, I)
      const z = Array.from({ length: n }, () => randn());
      const Dz = z.map((zi, i) => D[i] * zi);
      const BDz = matVecMult(B, Dz);
      const x = mean.map((m, i) => m + sigma * BDz[i]);

      arx.push(x);
      arfitness.push(objectiveFunction(x));
      counteval++;
    }

    // Sort by fitness (ascending - minimization)
    const arindex = arfitness
      .map((f, i) => [f, i])
      .sort((a, b) => a[0] - b[0])
      .map(pair => pair[1]);

    // Update best ever
    if (arfitness[arindex[0]] < bestEver.fitness) {
      bestEver = { x: [...arx[arindex[0]]], fitness: arfitness[arindex[0]] };
      if (onImprovement) {
        await onImprovement(bestEver.x, -bestEver.fitness); // negate for consistency with custom variant
      }
    }

    // Compute weighted mean of selected points
    const oldMean = [...mean];
    mean = Array(n).fill(0);
    for (let i = 0; i < mu; i++) {
      const idx = arindex[i];
      for (let j = 0; j < n; j++) {
        mean[j] += weights[i] * arx[idx][j];
      }
    }

    // Cumulation: Update evolution paths
    const meanDiff = mean.map((m, i) => (m - oldMean[i]) / sigma);
    const invsqrtC_meanDiff = matVecMult(invsqrtC, meanDiff);

    // Update ps (evolution path for sigma)
    const csComplement = Math.sqrt(cs * (2 - cs) * mueff);
    ps = ps.map((p, i) => (1 - cs) * p + csComplement * invsqrtC_meanDiff[i]);

    // Compute hsig (stalling criterion)
    const psNorm = Math.sqrt(ps.reduce((sum, p) => sum + p * p, 0));
    const hsigThreshold = (1.4 + 2 / (n + 1)) * chiN * Math.sqrt(1 - Math.pow(1 - cs, 2 * counteval / lambda));
    const hsig = psNorm / hsigThreshold < 1 ? 1 : 0;

    // Update pc (evolution path for C)
    const ccComplement = Math.sqrt(cc * (2 - cc) * mueff);
    pc = pc.map((p, i) => (1 - cc) * p + hsig * ccComplement * meanDiff[i]);

    // Adapt covariance matrix C
    const artmp = []; // weighted difference vectors
    for (let i = 0; i < mu; i++) {
      const idx = arindex[i];
      artmp.push(arx[idx].map((x, j) => (x - oldMean[j]) / sigma));
    }

    // Rank-one update term
    const pcOuter = outerProduct(pc, pc);

    // Rank-mu update term
    const rankMuMatrix = zeros(n, n);
    for (let i = 0; i < mu; i++) {
      const outer = outerProduct(artmp[i], artmp[i]);
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          rankMuMatrix[j][k] += weights[i] * outer[j][k];
        }
      }
    }

    // Update C
    const oldC_factor = 1 - c1 - cmu + (1 - hsig) * c1 * cc * (2 - cc);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        C[i][j] = oldC_factor * C[i][j] + c1 * pcOuter[i][j] + cmu * rankMuMatrix[i][j];
      }
    }

    // Adapt step size sigma
    sigma = sigma * Math.exp((cs / damps) * (psNorm / chiN - 1));

    // Decomposition of C into B*diag(D^2)*B' (eigendecomposition)
    // Only do this every n/10 evaluations for efficiency
    if (counteval - eigeneval > lambda / (c1 + cmu) / n / 10) {
      eigeneval = counteval;

      // Enforce symmetry
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
          C[i][j] = C[j][i] = (C[i][j] + C[j][i]) / 2;
        }
      }

      // Eigendecomposition
      const { eigenvectors, eigenvalues } = eigenDecomposition(C);
      B = eigenvectors;
      D = eigenvalues.map(e => Math.sqrt(Math.max(e, 1e-20))); // sqrt of eigenvalues

      // Compute C^(-1/2) = B * diag(1/D) * B'
      const invD = D.map(d => 1 / d);
      invsqrtC = zeros(n, n);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          for (let k = 0; k < n; k++) {
            invsqrtC[i][j] += B[i][k] * invD[k] * B[j][k];
          }
        }
      }
    }

    // Break on fitness stagnation or sigma explosion/collapse
    if (sigma > 1e10 || sigma < 1e-20) {
      break;
    }
  }

  return {
    solution: bestEver.x,
    fitness: bestEver.fitness,
    generations: generation,
    evaluations: counteval,
  };
}

// ============ Matrix Utilities ============

function identity(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function zeros(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function matVecMult(A, v) {
  return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
}

function outerProduct(a, b) {
  return a.map(ai => b.map(bj => ai * bj));
}

/**
 * Jacobi eigendecomposition for symmetric matrices
 * Returns eigenvalues and eigenvectors
 */
function eigenDecomposition(A) {
  const n = A.length;
  const maxIter = 100;
  const tol = 1e-10;

  // Copy A
  const D = A.map(row => [...row]);
  const V = identity(n);

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(D[i][j]) > maxVal) {
          maxVal = Math.abs(D[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tol) break;

    // Compute rotation
    const theta = (D[q][q] - D[p][p]) / (2 * D[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;

    // Apply rotation to D
    const Dpp = D[p][p];
    const Dqq = D[q][q];
    const Dpq = D[p][q];

    D[p][p] = c * c * Dpp - 2 * s * c * Dpq + s * s * Dqq;
    D[q][q] = s * s * Dpp + 2 * s * c * Dpq + c * c * Dqq;
    D[p][q] = D[q][p] = 0;

    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const Dip = D[i][p];
        const Diq = D[i][q];
        D[i][p] = D[p][i] = c * Dip - s * Diq;
        D[i][q] = D[q][i] = s * Dip + c * Diq;
      }
    }

    // Update eigenvectors
    for (let i = 0; i < n; i++) {
      const Vip = V[i][p];
      const Viq = V[i][q];
      V[i][p] = c * Vip - s * Viq;
      V[i][q] = s * Vip + c * Viq;
    }
  }

  // Extract eigenvalues from diagonal
  const eigenvalues = Array.from({ length: n }, (_, i) => D[i][i]);

  return { eigenvectors: V, eigenvalues };
}
