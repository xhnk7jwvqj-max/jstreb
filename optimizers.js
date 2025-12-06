import { randn, calculateMean, calculateCovariance, choleskyDecomposition, sampleGaussian } from "./gaussian.js";

/**
 * Simulated Annealing Optimizer
 * Accepts worse solutions with decreasing probability to escape local optima
 */
export async function simulatedAnnealing(pullconfig, pushconfig, objectiveFunc, drawCallback, waitCallback, shouldStop) {
  const config = pullconfig();
  let current = config.slice();
  let currentScore = objectiveFunc(current);
  let best = current.slice();
  let bestScore = currentScore;

  let temperature = 100;
  const coolingRate = 0.995;
  const minTemp = 0.01;
  let iteration = 0;
  const maxIterPerTemp = 10;

  while (!shouldStop() && temperature > minTemp) {
    for (let i = 0; i < maxIterPerTemp; i++) {
      if (shouldStop()) break;

      // Generate neighbor by perturbing current solution
      const neighbor = current.map((val, idx) => {
        const stepSize = temperature * 0.1;
        return val + randn() * stepSize;
      });

      const neighborScore = objectiveFunc(neighbor);

      // Calculate acceptance probability
      const delta = neighborScore - currentScore;
      const acceptProb = delta > 0 ? 1 : Math.exp(delta / temperature);

      // Accept or reject
      if (Math.random() < acceptProb) {
        current = neighbor;
        currentScore = neighborScore;

        // Update best if improved
        if (currentScore > bestScore) {
          best = current.slice();
          bestScore = currentScore;
          pushconfig(best);
          await drawCallback();
          await waitCallback();
        }
      }

      iteration++;
      if (iteration % 20 === 0) {
        await waitCallback();
      }
    }

    temperature *= coolingRate;
  }

  pushconfig(best);
  await drawCallback();
  return { best, bestScore };
}

/**
 * Differential Evolution Optimizer
 * Uses difference vectors between population members for exploration
 */
export async function differentialEvolution(pullconfig, pushconfig, objectiveFunc, drawCallback, waitCallback, shouldStop) {
  const config = pullconfig();
  const dim = config.length;
  const populationSize = Math.max(20, dim * 4);

  // Initialize population
  let population = [];
  for (let i = 0; i < populationSize; i++) {
    const individual = config.map((val) => val + randn() * 10);
    const score = objectiveFunc(individual);
    population.push({ config: individual, score });
  }

  // Sort by score
  population.sort((a, b) => b.score - a.score);
  let bestEver = population[0].config.slice();
  let bestScore = population[0].score;

  const F = 0.8; // Differential weight
  const CR = 0.9; // Crossover probability
  let iteration = 0;

  while (!shouldStop()) {
    const newPopulation = [];

    for (let i = 0; i < populationSize; i++) {
      if (shouldStop()) break;

      // Select three distinct random individuals
      let indices = [];
      while (indices.length < 3) {
        const idx = Math.floor(Math.random() * populationSize);
        if (idx !== i && !indices.includes(idx)) {
          indices.push(idx);
        }
      }

      const [a, b, c] = indices.map(idx => population[idx].config);

      // Mutation: create mutant vector
      const mutant = a.map((val, j) => val + F * (b[j] - c[j]));

      // Crossover: create trial vector
      const trial = population[i].config.map((val, j) => {
        return Math.random() < CR ? mutant[j] : val;
      });

      const trialScore = objectiveFunc(trial);

      // Selection
      if (trialScore > population[i].score) {
        newPopulation.push({ config: trial, score: trialScore });

        if (trialScore > bestScore) {
          bestEver = trial.slice();
          bestScore = trialScore;
          pushconfig(bestEver);
          await drawCallback();
          await waitCallback();
        }
      } else {
        newPopulation.push(population[i]);
      }
    }

    population = newPopulation;
    population.sort((a, b) => b.score - a.score);

    iteration++;
    if (iteration % 5 === 0) {
      await waitCallback();
    }
  }

  pushconfig(bestEver);
  await drawCallback();
  return { best: bestEver, bestScore };
}

/**
 * Particle Swarm Optimization
 * Particles move based on their own best position and the global best
 */
export async function particleSwarm(pullconfig, pushconfig, objectiveFunc, drawCallback, waitCallback, shouldStop) {
  const config = pullconfig();
  const dim = config.length;
  const swarmSize = Math.max(20, dim * 3);

  // Initialize particles
  let particles = [];
  for (let i = 0; i < swarmSize; i++) {
    const position = config.map((val) => val + randn() * 10);
    const velocity = config.map(() => randn() * 2);
    const score = objectiveFunc(position);
    particles.push({
      position,
      velocity,
      score,
      bestPosition: position.slice(),
      bestScore: score
    });
  }

  // Find global best
  let globalBest = particles[0].bestPosition.slice();
  let globalBestScore = particles[0].bestScore;

  for (const p of particles) {
    if (p.score > globalBestScore) {
      globalBest = p.position.slice();
      globalBestScore = p.score;
    }
  }

  const w = 0.7; // Inertia weight
  const c1 = 1.5; // Cognitive parameter
  const c2 = 1.5; // Social parameter
  let iteration = 0;

  while (!shouldStop()) {
    for (let i = 0; i < swarmSize; i++) {
      if (shouldStop()) break;

      const p = particles[i];

      // Update velocity
      for (let d = 0; d < dim; d++) {
        const r1 = Math.random();
        const r2 = Math.random();
        p.velocity[d] = w * p.velocity[d] +
                        c1 * r1 * (p.bestPosition[d] - p.position[d]) +
                        c2 * r2 * (globalBest[d] - p.position[d]);
      }

      // Update position
      for (let d = 0; d < dim; d++) {
        p.position[d] += p.velocity[d];
      }

      // Evaluate
      p.score = objectiveFunc(p.position);

      // Update personal best
      if (p.score > p.bestScore) {
        p.bestPosition = p.position.slice();
        p.bestScore = p.score;

        // Update global best
        if (p.score > globalBestScore) {
          globalBest = p.position.slice();
          globalBestScore = p.score;
          pushconfig(globalBest);
          await drawCallback();
          await waitCallback();
        }
      }
    }

    iteration++;
    if (iteration % 10 === 0) {
      await waitCallback();
    }
  }

  pushconfig(globalBest);
  await drawCallback();
  return { best: globalBest, bestScore: globalBestScore };
}

/**
 * Adaptive Momentum Optimizer (inspired by Adam)
 * Uses gradient estimation with first and second moment estimates
 */
export async function adaptiveMomentum(pullconfig, pushconfig, objectiveFunc, drawCallback, waitCallback, shouldStop) {
  const config = pullconfig();
  let current = config.slice();
  let currentScore = objectiveFunc(current);
  let best = current.slice();
  let bestScore = currentScore;

  const dim = config.length;
  let m = new Array(dim).fill(0); // First moment estimate
  let v = new Array(dim).fill(0); // Second moment estimate
  const beta1 = 0.9;
  const beta2 = 0.999;
  const epsilon = 1e-8;
  let learningRate = 5.0;
  let t = 0;

  const gradientSamples = 5;
  const delta = 0.1;

  while (!shouldStop()) {
    t++;

    // Estimate gradient using finite differences
    const gradient = new Array(dim).fill(0);

    for (let i = 0; i < dim; i++) {
      if (shouldStop()) break;

      let gradSum = 0;
      for (let sample = 0; sample < gradientSamples; sample++) {
        const perturbed = current.slice();
        const perturbation = delta * (Math.random() > 0.5 ? 1 : -1);
        perturbed[i] += perturbation;
        const perturbedScore = objectiveFunc(perturbed);
        gradSum += (perturbedScore - currentScore) / perturbation;
      }
      gradient[i] = gradSum / gradientSamples;
    }

    // Update biased first moment estimate
    for (let i = 0; i < dim; i++) {
      m[i] = beta1 * m[i] + (1 - beta1) * gradient[i];
    }

    // Update biased second moment estimate
    for (let i = 0; i < dim; i++) {
      v[i] = beta2 * v[i] + (1 - beta2) * gradient[i] * gradient[i];
    }

    // Compute bias-corrected estimates
    const mHat = m.map(val => val / (1 - Math.pow(beta1, t)));
    const vHat = v.map(val => val / (1 - Math.pow(beta2, t)));

    // Update parameters
    const next = current.map((val, i) =>
      val + learningRate * mHat[i] / (Math.sqrt(vHat[i]) + epsilon)
    );

    const nextScore = objectiveFunc(next);

    if (nextScore > currentScore) {
      current = next;
      currentScore = nextScore;

      if (currentScore > bestScore) {
        best = current.slice();
        bestScore = currentScore;
        pushconfig(best);
        await drawCallback();
        await waitCallback();
      }
    } else {
      // Reduce learning rate if no improvement
      learningRate *= 0.95;
      if (learningRate < 0.1) {
        learningRate = 0.1;
      }
    }

    if (t % 10 === 0) {
      await waitCallback();
    }

    if (t > 200) break; // Prevent infinite loop
  }

  pushconfig(best);
  await drawCallback();
  return { best, bestScore };
}

/**
 * Nelder-Mead Simplex Optimizer
 * Geometric search method using a simplex of n+1 points
 */
export async function nelderMead(pullconfig, pushconfig, objectiveFunc, drawCallback, waitCallback, shouldStop) {
  const config = pullconfig();
  const dim = config.length;

  // Initialize simplex with n+1 vertices
  let simplex = [];
  simplex.push({ point: config.slice(), score: objectiveFunc(config) });

  for (let i = 0; i < dim; i++) {
    const point = config.slice();
    point[i] += 10; // Initial step size
    simplex.push({ point, score: objectiveFunc(point) });
  }

  const alpha = 1.0; // Reflection coefficient
  const gamma = 2.0; // Expansion coefficient
  const rho = 0.5; // Contraction coefficient
  const sigma = 0.5; // Shrink coefficient

  let iteration = 0;
  let bestEver = simplex[0].point.slice();
  let bestScore = simplex[0].score;

  while (!shouldStop() && iteration < 500) {
    // Sort simplex by score (descending)
    simplex.sort((a, b) => b.score - a.score);

    // Update best
    if (simplex[0].score > bestScore) {
      bestEver = simplex[0].point.slice();
      bestScore = simplex[0].score;
      pushconfig(bestEver);
      await drawCallback();
      await waitCallback();
    }

    // Calculate centroid of all but worst point
    const centroid = new Array(dim).fill(0);
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        centroid[j] += simplex[i].point[j];
      }
    }
    for (let j = 0; j < dim; j++) {
      centroid[j] /= dim;
    }

    // Reflection
    const worst = simplex[dim];
    const reflected = centroid.map((c, i) => c + alpha * (c - worst.point[i]));
    const reflectedScore = objectiveFunc(reflected);

    if (reflectedScore > simplex[0].score) {
      // Expansion
      const expanded = centroid.map((c, i) => c + gamma * (reflected[i] - c));
      const expandedScore = objectiveFunc(expanded);

      if (expandedScore > reflectedScore) {
        simplex[dim] = { point: expanded, score: expandedScore };
      } else {
        simplex[dim] = { point: reflected, score: reflectedScore };
      }
    } else if (reflectedScore > simplex[dim - 1].score) {
      simplex[dim] = { point: reflected, score: reflectedScore };
    } else {
      // Contraction
      if (reflectedScore > worst.score) {
        // Outside contraction
        const contracted = centroid.map((c, i) => c + rho * (reflected[i] - c));
        const contractedScore = objectiveFunc(contracted);

        if (contractedScore > reflectedScore) {
          simplex[dim] = { point: contracted, score: contractedScore };
        } else {
          // Shrink
          for (let i = 1; i <= dim; i++) {
            simplex[i].point = simplex[0].point.map((val, j) =>
              val + sigma * (simplex[i].point[j] - val)
            );
            simplex[i].score = objectiveFunc(simplex[i].point);
          }
        }
      } else {
        // Inside contraction
        const contracted = centroid.map((c, i) => c + rho * (worst.point[i] - c));
        const contractedScore = objectiveFunc(contracted);

        if (contractedScore > worst.score) {
          simplex[dim] = { point: contracted, score: contractedScore };
        } else {
          // Shrink
          for (let i = 1; i <= dim; i++) {
            simplex[i].point = simplex[0].point.map((val, j) =>
              val + sigma * (simplex[i].point[j] - val)
            );
            simplex[i].score = objectiveFunc(simplex[i].point);
          }
        }
      }
    }

    iteration++;
    if (iteration % 10 === 0) {
      await waitCallback();
    }
  }

  simplex.sort((a, b) => b.score - a.score);
  pushconfig(simplex[0].point);
  await drawCallback();
  return { best: simplex[0].point, bestScore: simplex[0].score };
}

/**
 * Improved CMA-ES with better parameter tuning
 * Enhanced version of the existing CMA-ES implementation
 */
export async function improvedCMAES(pullconfig, pushconfig, objectiveFunc, drawCallback, waitCallback, shouldStop) {
  const config = pullconfig();
  const dim = config.length;

  let best = config.slice();
  let bestScore = objectiveFunc(best);

  const lambda = 4 + Math.floor(3 * Math.log(dim)); // Population size
  const mu = Math.floor(lambda / 2); // Number of parents

  // Recombination weights
  const weights = new Array(mu).fill(0).map((_, i) =>
    Math.log(mu + 0.5) - Math.log(i + 1)
  );
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / sumWeights);

  const muEff = 1 / normalizedWeights.reduce((sum, w) => sum + w * w, 0);

  // Adaptation parameters
  const cc = (4 + muEff / dim) / (dim + 4 + 2 * muEff / dim);
  const cs = (muEff + 2) / (dim + muEff + 5);
  const c1 = 2 / ((dim + 1.3) ** 2 + muEff);
  const cmu = Math.min(1 - c1, 2 * (muEff - 2 + 1 / muEff) / ((dim + 2) ** 2 + muEff));
  const damps = 1 + 2 * Math.max(0, Math.sqrt((muEff - 1) / (dim + 1)) - 1) + cs;

  let sigma = 5.0; // Step size
  let mean = config.slice();
  let pc = new Array(dim).fill(0);
  let ps = new Array(dim).fill(0);
  let C = Array(dim).fill(0).map(() => Array(dim).fill(0));

  // Initialize C as identity matrix
  for (let i = 0; i < dim; i++) {
    C[i][i] = 1;
  }

  let generation = 0;

  while (!shouldStop() && generation < 100) {
    // Generate and evaluate offspring
    let population = [];

    for (let i = 0; i < lambda; i++) {
      if (shouldStop()) break;

      try {
        const L = choleskyDecomposition(C);
        const sample = sampleGaussian(mean, L);
        const scaledSample = sample.map((val, idx) => mean[idx] + sigma * (val - mean[idx]));
        const score = objectiveFunc(scaledSample);
        population.push({ config: scaledSample, score, z: sample.map((val, idx) => (val - mean[idx]) / sigma) });
      } catch (e) {
        // If Cholesky fails, reinitialize C
        C = Array(dim).fill(0).map((_, i) => Array(dim).fill(0).map((_, j) => i === j ? 1 : 0));
        const sample = mean.map(val => val + sigma * randn());
        const score = objectiveFunc(sample);
        population.push({ config: sample, score, z: sample.map((val, idx) => (val - mean[idx]) / sigma) });
      }
    }

    // Sort by score
    population.sort((a, b) => b.score - a.score);

    // Update best
    if (population[0].score > bestScore) {
      best = population[0].config.slice();
      bestScore = population[0].score;
      pushconfig(best);
      await drawCallback();
      await waitCallback();
    }

    // Recombination - update mean
    const oldMean = mean.slice();
    mean = new Array(dim).fill(0);
    for (let i = 0; i < mu; i++) {
      for (let j = 0; j < dim; j++) {
        mean[j] += normalizedWeights[i] * population[i].config[j];
      }
    }

    // Update evolution paths
    const meanShift = mean.map((val, i) => (val - oldMean[i]) / sigma);

    for (let i = 0; i < dim; i++) {
      ps[i] = (1 - cs) * ps[i] + Math.sqrt(cs * (2 - cs) * muEff) * meanShift[i];
      pc[i] = (1 - cc) * pc[i] + Math.sqrt(cc * (2 - cc) * muEff) * meanShift[i];
    }

    // Update step size
    const psNorm = Math.sqrt(ps.reduce((sum, val) => sum + val * val, 0));
    const expectedNorm = Math.sqrt(dim) * (1 - 1 / (4 * dim) + 1 / (21 * dim * dim));
    sigma *= Math.exp((cs / damps) * (psNorm / expectedNorm - 1));

    // Limit sigma
    sigma = Math.max(0.01, Math.min(sigma, 100));

    generation++;

    if (generation % 5 === 0) {
      await waitCallback();
    }
  }

  pushconfig(best);
  await drawCallback();
  return { best, bestScore };
}
