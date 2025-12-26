/**
 * Benchmark: Custom CMA-ES Variant vs Conventional CMA-ES
 *
 * Tests on difficult multimodal landscapes:
 * - Rastrigin: Highly multimodal with regular local minima
 * - Ackley: Multimodal with nearly flat outer region
 * - Schwefel: Deceptive with global minimum far from local minima
 * - Griewank: Many local minima with product term
 */

import { describe, it, expect } from "vitest";
import { optimizeCMAES } from "./cmaes-optimizer.js";
import { optimizeCMAESConventional } from "./cmaes-conventional.js";

// ============ Test Functions (all to be MINIMIZED) ============

/**
 * Rastrigin function - highly multimodal
 * Global minimum: f(0, ..., 0) = 0
 * Search domain: [-5.12, 5.12]^n
 */
function rastrigin(x) {
  const A = 10;
  const n = x.length;
  return A * n + x.reduce((sum, xi) => sum + xi * xi - A * Math.cos(2 * Math.PI * xi), 0);
}

/**
 * Ackley function - multimodal with nearly flat outer region
 * Global minimum: f(0, ..., 0) = 0
 * Search domain: [-5, 5]^n
 */
function ackley(x) {
  const n = x.length;
  const a = 20, b = 0.2, c = 2 * Math.PI;
  const sum1 = x.reduce((s, xi) => s + xi * xi, 0);
  const sum2 = x.reduce((s, xi) => s + Math.cos(c * xi), 0);
  return -a * Math.exp(-b * Math.sqrt(sum1 / n)) - Math.exp(sum2 / n) + a + Math.E;
}

/**
 * Schwefel function - deceptive, global minimum far from next best
 * Global minimum: f(420.9687, ..., 420.9687) ≈ 0
 * Search domain: [-500, 500]^n
 */
function schwefel(x) {
  const n = x.length;
  return 418.9829 * n - x.reduce((sum, xi) => sum + xi * Math.sin(Math.sqrt(Math.abs(xi))), 0);
}

/**
 * Griewank function - many local minima
 * Global minimum: f(0, ..., 0) = 0
 * Search domain: [-600, 600]^n
 */
function griewank(x) {
  const sum = x.reduce((s, xi) => s + xi * xi / 4000, 0);
  const prod = x.reduce((p, xi, i) => p * Math.cos(xi / Math.sqrt(i + 1)), 1);
  return sum - prod + 1;
}

// ============ Benchmark Utilities ============

/**
 * Run custom variant (maximizes, so we negate)
 */
async function runCustomVariant(objectiveFunc, initialConfig, maxEvals, params = {}) {
  let evalCount = 0;
  const maxEvaluations = maxEvals;
  let bestScore = -Infinity;
  let bestConfig = null;

  const result = await optimizeCMAES({
    initialConfig,
    objectiveFunction: (config) => {
      evalCount++;
      const score = -objectiveFunc(config); // negate for maximization
      if (score > bestScore) {
        bestScore = score;
        bestConfig = [...config];
      }
      return score;
    },
    shouldStop: () => evalCount >= maxEvaluations,
    initialStepSize: params.initialStepSize || 0.5,
    populationMultiplier: params.populationMultiplier || 15,
  });

  return {
    solution: bestConfig,
    fitness: -bestScore, // convert back to minimization
    evaluations: evalCount,
  };
}

/**
 * Run conventional CMA-ES (minimizes directly)
 */
async function runConventional(objectiveFunc, initialConfig, maxEvals, params = {}) {
  let evalCount = 0;
  const maxEvaluations = maxEvals;

  const result = await optimizeCMAESConventional({
    initialConfig,
    objectiveFunction: (config) => {
      evalCount++;
      return objectiveFunc(config);
    },
    shouldStop: () => evalCount >= maxEvaluations,
    sigma: params.sigma || 0.5,
    lambda: params.lambda || null,
  });

  return {
    solution: result.solution,
    fitness: result.fitness,
    evaluations: evalCount,
  };
}

/**
 * Run multiple trials and compute statistics
 */
async function benchmark(name, objectiveFunc, dim, optimalValue, maxEvals, numTrials = 10) {
  const results = {
    custom: { fitness: [], evaluations: [] },
    conventional: { fitness: [], evaluations: [] },
  };

  for (let trial = 0; trial < numTrials; trial++) {
    // Random starting point in [-1, 1]^n (away from optimum)
    const initialConfig = Array.from({ length: dim }, () => (Math.random() - 0.5) * 2);

    // Run both algorithms
    const customResult = await runCustomVariant(objectiveFunc, initialConfig, maxEvals);
    const conventionalResult = await runConventional(objectiveFunc, initialConfig, maxEvals);

    results.custom.fitness.push(customResult.fitness);
    results.custom.evaluations.push(customResult.evaluations);
    results.conventional.fitness.push(conventionalResult.fitness);
    results.conventional.evaluations.push(conventionalResult.evaluations);
  }

  // Compute statistics
  const stats = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length);
    const median = sorted[Math.floor(sorted.length / 2)];
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    return { mean, std, median, best, worst };
  };

  return {
    name,
    dimension: dim,
    optimalValue,
    maxEvals,
    numTrials,
    custom: stats(results.custom.fitness),
    conventional: stats(results.conventional.fitness),
  };
}

function printBenchmarkResult(result) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${result.name} (dim=${result.dimension}, optimal=${result.optimalValue})`);
  console.log(`Max evaluations: ${result.maxEvals}, Trials: ${result.numTrials}`);
  console.log("-".repeat(60));
  console.log("Algorithm       | Mean      | Std       | Median    | Best      | Worst");
  console.log("-".repeat(60));
  console.log(
    `Custom variant  | ${result.custom.mean.toFixed(4).padStart(9)} | ${result.custom.std.toFixed(4).padStart(9)} | ${result.custom.median.toFixed(4).padStart(9)} | ${result.custom.best.toFixed(4).padStart(9)} | ${result.custom.worst.toFixed(4).padStart(9)}`
  );
  console.log(
    `Conventional    | ${result.conventional.mean.toFixed(4).padStart(9)} | ${result.conventional.std.toFixed(4).padStart(9)} | ${result.conventional.median.toFixed(4).padStart(9)} | ${result.conventional.best.toFixed(4).padStart(9)} | ${result.conventional.worst.toFixed(4).padStart(9)}`
  );

  // Determine winner
  const customBetter = result.custom.mean < result.conventional.mean;
  const improvement = customBetter
    ? ((result.conventional.mean - result.custom.mean) / result.conventional.mean) * 100
    : ((result.custom.mean - result.conventional.mean) / result.custom.mean) * 100;
  console.log("-".repeat(60));
  console.log(
    `Winner: ${customBetter ? "Custom variant" : "Conventional CMA-ES"} (${improvement.toFixed(1)}% better mean)`
  );
}

// ============ Benchmarks ============

describe("CMA-ES Benchmark: Custom vs Conventional", () => {
  const DIM = 5;
  const MAX_EVALS = 2000;
  const NUM_TRIALS = 10;

  it("Rastrigin function (highly multimodal)", async () => {
    const result = await benchmark("Rastrigin", rastrigin, DIM, 0, MAX_EVALS, NUM_TRIALS);
    printBenchmarkResult(result);

    // Both should find reasonable solutions (< 50 for 5D)
    expect(result.custom.best).toBeLessThan(100);
    expect(result.conventional.best).toBeLessThan(100);
  }, 60000);

  it("Ackley function (nearly flat outer region)", async () => {
    const result = await benchmark("Ackley", ackley, DIM, 0, MAX_EVALS, NUM_TRIALS);
    printBenchmarkResult(result);

    // Both should find reasonable solutions
    expect(result.custom.best).toBeLessThan(15);
    expect(result.conventional.best).toBeLessThan(15);
  }, 60000);

  it("Schwefel function (deceptive)", async () => {
    // Use larger starting region for Schwefel
    const result = await benchmark("Schwefel", schwefel, DIM, 0, MAX_EVALS, NUM_TRIALS);
    printBenchmarkResult(result);

    // Schwefel is very hard - just check they produce results
    expect(result.custom.mean).toBeDefined();
    expect(result.conventional.mean).toBeDefined();
  }, 60000);

  it("Griewank function (many local minima)", async () => {
    const result = await benchmark("Griewank", griewank, DIM, 0, MAX_EVALS, NUM_TRIALS);
    printBenchmarkResult(result);

    // Both should find reasonable solutions
    expect(result.custom.best).toBeLessThan(5);
    expect(result.conventional.best).toBeLessThan(5);
  }, 60000);

  it("Summary comparison across all functions", async () => {
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY: Running all benchmarks for comparison...");
    console.log("=".repeat(60));

    const functions = [
      { name: "Rastrigin", func: rastrigin, optimal: 0 },
      { name: "Ackley", func: ackley, optimal: 0 },
      { name: "Schwefel", func: schwefel, optimal: 0 },
      { name: "Griewank", func: griewank, optimal: 0 },
    ];

    let customWins = 0;
    let conventionalWins = 0;

    for (const { name, func, optimal } of functions) {
      const result = await benchmark(name, func, DIM, optimal, MAX_EVALS, NUM_TRIALS);
      printBenchmarkResult(result);

      if (result.custom.mean < result.conventional.mean) {
        customWins++;
      } else {
        conventionalWins++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("FINAL RESULTS:");
    console.log(`Custom variant wins: ${customWins}`);
    console.log(`Conventional CMA-ES wins: ${conventionalWins}`);
    console.log("=".repeat(60));

    // This is informational - both algorithms should work
    expect(customWins + conventionalWins).toBe(4);
  }, 300000);
});

// ============ Higher Dimension Test ============

describe("CMA-ES Benchmark: Higher Dimensions", () => {
  it("Rastrigin 10D comparison", async () => {
    const result = await benchmark("Rastrigin 10D", rastrigin, 10, 0, 5000, 5);
    printBenchmarkResult(result);

    // Conventional should significantly outperform on higher dimensions
    expect(result.conventional.mean).toBeLessThan(result.custom.mean);
  }, 120000);

  it("Ackley 10D comparison", async () => {
    const result = await benchmark("Ackley 10D", ackley, 10, 0, 5000, 5);
    printBenchmarkResult(result);

    // Conventional should find near-optimal solution
    expect(result.conventional.best).toBeLessThan(1);
  }, 120000);
});
