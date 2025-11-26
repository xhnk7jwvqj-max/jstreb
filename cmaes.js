/**
 * Simple CMA-ES (Covariance Matrix Adaptation Evolution Strategy)
 * Adapted for mixed binary/continuous optimization
 */

export class CMAES {
  constructor(dimension, options = {}) {
    this.dim = dimension;

    // Population size
    this.lambda = options.lambda || 4 + Math.floor(3 * Math.log(dimension));
    this.mu = options.mu || Math.floor(this.lambda / 2);

    // Initial mean (center of search space)
    this.mean = options.initialMean || new Array(dimension).fill(0.5);

    // Initial step size
    this.sigma = options.sigma || 0.3;

    // Weights for recombination
    this.weights = new Array(this.mu);
    for (let i = 0; i < this.mu; i++) {
      this.weights[i] = Math.log(this.mu + 0.5) - Math.log(i + 1);
    }
    const sumWeights = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(w => w / sumWeights);
    this.mueff = 1 / this.weights.reduce((sum, w) => sum + w * w, 0);

    // Adaptation parameters
    this.cc = (4 + this.mueff / dimension) / (dimension + 4 + 2 * this.mueff / dimension);
    this.cs = (this.mueff + 2) / (dimension + this.mueff + 5);
    this.c1 = 2 / ((dimension + 1.3) * (dimension + 1.3) + this.mueff);
    this.cmu = Math.min(1 - this.c1, 2 * (this.mueff - 2 + 1/this.mueff) / ((dimension + 2) * (dimension + 2) + this.mueff));
    this.damps = 1 + 2 * Math.max(0, Math.sqrt((this.mueff - 1) / (dimension + 1)) - 1) + this.cs;

    // Dynamic strategy parameters
    this.pc = new Array(dimension).fill(0); // Evolution path for C
    this.ps = new Array(dimension).fill(0); // Evolution path for sigma

    // Covariance matrix (start with identity)
    this.C = Array(dimension).fill(0).map(() => Array(dimension).fill(0));
    for (let i = 0; i < dimension; i++) {
      this.C[i][i] = 1;
    }

    // B and D for eigendecomposition (updated lazily)
    this.B = null;
    this.D = null;
    this.eigeneval = 0;

    // Expectation of ||N(0,I)||
    this.chiN = Math.sqrt(dimension) * (1 - 1/(4*dimension) + 1/(21*dimension*dimension));

    this.generation = 0;
  }

  /**
   * Generate lambda offspring
   */
  samplePopulation(rng = () => Math.random()) {
    // Update eigendecomposition if needed
    if (this.generation % Math.floor(1 / (this.c1 + this.cmu) / this.dim / 10) === 0) {
      this._updateEigen();
    }

    const population = [];

    for (let i = 0; i < this.lambda; i++) {
      // Sample from N(0, I)
      const z = this._sampleNormal(this.dim, rng);

      // Transform to N(0, C) = B * D * z
      const y = this._transform(z);

      // Add to mean with step size
      const x = this.mean.map((m, j) => m + this.sigma * y[j]);

      // Clip to [0, 1] for most variables (slider normals can be negative)
      const clipped = x.map((val, j) => {
        // Assuming slider normals are at the end
      // For now, clip all to reasonable bounds
        return Math.max(-1, Math.min(1, val));
      });

      population.push(clipped);
    }

    return population;
  }

  /**
   * Update distribution based on fitness evaluations
   * individuals: array of [vector, fitness] pairs, sorted by fitness (best first)
   */
  update(individuals) {
    // Sort by fitness (descending - higher is better)
    individuals.sort((a, b) => b[1] - a[1]);

    // Select mu best
    const selected = individuals.slice(0, this.mu);

    // Old mean
    const oldMean = [...this.mean];

    // Compute new mean (weighted recombination)
    this.mean = new Array(this.dim).fill(0);
    for (let i = 0; i < this.mu; i++) {
      const weight = this.weights[i];
      const individual = selected[i][0];
      for (let j = 0; j < this.dim; j++) {
        this.mean[j] += weight * individual[j];
      }
    }

    // Update evolution paths
    const meanShift = this.mean.map((m, i) => (m - oldMean[i]) / this.sigma);

    // Cumulation for sigma (ps)
    const Cinvsqrt_meanShift = this._transformInverse(meanShift);
    for (let i = 0; i < this.dim; i++) {
      this.ps[i] = (1 - this.cs) * this.ps[i] +
                   Math.sqrt(this.cs * (2 - this.cs) * this.mueff) * Cinvsqrt_meanShift[i];
    }

    // Cumulation for covariance (pc)
    const psNorm = this._norm(this.ps);
    const hsig = psNorm / Math.sqrt(1 - Math.pow(1 - this.cs, 2 * (this.generation + 1))) / this.chiN < 1.4 + 2 / (this.dim + 1);

    for (let i = 0; i < this.dim; i++) {
      this.pc[i] = (1 - this.cc) * this.pc[i] +
                   (hsig ? Math.sqrt(this.cc * (2 - this.cc) * this.mueff) : 0) * meanShift[i];
    }

    // Update covariance matrix
    // C = (1-c1-cmu) * C + c1 * pc * pc^T + cmu * sum(w_i * y_i * y_i^T)
    const factor = 1 - this.c1 - this.cmu + (1 - hsig) * this.c1 * this.cc * (2 - this.cc);

    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j <= i; j++) {
        this.C[i][j] = factor * this.C[i][j] + this.c1 * this.pc[i] * this.pc[j];

        // Add rank-mu update
        for (let k = 0; k < this.mu; k++) {
          const y = selected[k][0].map((x, idx) => (x - oldMean[idx]) / this.sigma);
          this.C[i][j] += this.cmu * this.weights[k] * y[i] * y[j];
        }

        if (i !== j) {
          this.C[j][i] = this.C[i][j]; // Symmetry
        }
      }
    }

    // Update sigma
    this.sigma *= Math.exp((this.cs / this.damps) * (psNorm / this.chiN - 1));

    this.generation++;

    return {
      bestFitness: selected[0][1],
      meanFitness: individuals.reduce((sum, ind) => sum + ind[1], 0) / individuals.length,
      sigma: this.sigma,
    };
  }

  // Helper methods

  _sampleNormal(n, rng) {
    const samples = [];
    for (let i = 0; i < n; i++) {
      // Box-Muller transform
      const u1 = rng();
      const u2 = rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      samples.push(z);
    }
    return samples;
  }

  _transform(z) {
    // y = B * D * z
    if (!this.B || !this.D) {
      this._updateEigen();
    }

    const Dz = z.map((val, i) => this.D[i] * val);
    const y = new Array(this.dim).fill(0);

    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        y[i] += this.B[i][j] * Dz[j];
      }
    }

    return y;
  }

  _transformInverse(x) {
    // y = B * D^-1 * B^T * x
    if (!this.B || !this.D) {
      this._updateEigen();
    }

    // B^T * x
    const BTx = new Array(this.dim).fill(0);
    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        BTx[i] += this.B[j][i] * x[j];
      }
    }

    // D^-1 * (B^T * x)
    const DinvBTx = BTx.map((val, i) => val / Math.max(this.D[i], 1e-10));

    // B * (D^-1 * B^T * x)
    const y = new Array(this.dim).fill(0);
    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        y[i] += this.B[i][j] * DinvBTx[j];
      }
    }

    return y;
  }

  _updateEigen() {
    // Simple power iteration for dominant eigenvectors
    // For production, use proper eigendecomposition library
    // Here we approximate with the current C matrix

    this.B = Array(this.dim).fill(0).map(() => Array(this.dim).fill(0));
    this.D = new Array(this.dim).fill(1);

    // Simplified: use diagonal as approximation
    for (let i = 0; i < this.dim; i++) {
      this.D[i] = Math.sqrt(Math.max(this.C[i][i], 1e-10));
      this.B[i][i] = 1;
    }

    this.eigeneval++;
  }

  _norm(vector) {
    return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  }
}
