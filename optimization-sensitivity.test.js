import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange } from "./trebuchetsimulation.js";
import { generateRandomTrebuchets } from "./random-topology-generator.js";
import { optimizeRange } from "./range-optimizer.js";

/**
 * Calculate Euclidean distance between two states (positions only)
 */
function calculateStateDistance(state1, state2, numParticles) {
  let sumSquares = 0;
  for (let i = 0; i < 2 * numParticles; i++) {
    const diff = state1[i] - state2[i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

/**
 * Measure sensitivity to initial conditions for a given configuration
 * @param {Object} data - Trebuchet configuration
 * @param {number} perturbationSize - Size of perturbation
 * @param {number} numPerturbations - Number of perturbations to test
 * @returns {Object} Sensitivity metrics
 */
function measureSensitivity(data, perturbationSize = 0.01, numPerturbations = 3) {
  fillEmptyConstraints(data);
  const numParticles = data.particles.length;

  // Create terminate function
  function terminate(trajectories) {
    if (trajectories.length === 0) return false;
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  try {
    // Run baseline simulation
    const [baselineTrajectories] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );

    if (baselineTrajectories.length === 0) {
      return { error: "Baseline simulation failed" };
    }

    const baselineRange = calculateRange(baselineTrajectories, data);

    // Test perturbations
    const results = [];

    for (let perturbIdx = 0; perturbIdx < numPerturbations; perturbIdx++) {
      // Create perturbed particles with deterministic randomness
      const seed = perturbIdx * 1000;
      let rng = seed;
      const pseudoRandom = () => {
        rng = (rng * 9301 + 49297) % 233280;
        return rng / 233280;
      };

      const perturbedParticles = data.particles.map((p) => ({
        ...p,
        x: p.x + (pseudoRandom() - 0.5) * 2 * perturbationSize,
        y: p.y + (pseudoRandom() - 0.5) * 2 * perturbationSize,
      }));

      // Run perturbed simulation
      const [perturbedTrajectories] = simulate(
        perturbedParticles,
        data.constraints,
        data.timestep,
        data.duration,
        terminate
      );

      if (perturbedTrajectories.length === 0) {
        continue;
      }

      const perturbedRange = calculateRange(perturbedTrajectories, data);

      // Calculate divergence
      const minLength = Math.min(
        baselineTrajectories.length,
        perturbedTrajectories.length
      );
      const divergences = [];

      for (let i = 0; i < minLength; i++) {
        const posDiv = calculateStateDistance(
          baselineTrajectories[i],
          perturbedTrajectories[i],
          numParticles
        );
        divergences.push(posDiv);
      }

      const maxDivergence = Math.max(...divergences);
      const finalDivergence = divergences[divergences.length - 1];
      const initialDiv = divergences[0];

      // Calculate growth rate
      let growthRate = 0;
      if (finalDivergence > initialDiv && divergences.length > 1) {
        const timeSpan = (divergences.length - 1) * data.timestep;
        growthRate = Math.log(finalDivergence / initialDiv) / timeSpan;
      }

      results.push({
        maxDivergence,
        finalDivergence,
        growthRate,
        rangeDifference: Math.abs(perturbedRange - baselineRange),
      });
    }

    if (results.length === 0) {
      return { error: "All perturbations failed" };
    }

    // Aggregate results
    const avgGrowthRate =
      results.reduce((sum, r) => sum + r.growthRate, 0) / results.length;
    const avgMaxDivergence =
      results.reduce((sum, r) => sum + r.maxDivergence, 0) / results.length;
    const avgRangeDifference =
      results.reduce((sum, r) => sum + r.rangeDifference, 0) / results.length;

    return {
      baselineRange,
      avgGrowthRate,
      avgMaxDivergence,
      avgRangeDifference,
      numSuccessful: results.length,
    };
  } catch (error) {
    return { error: error.message };
  }
}

test("random topology optimization and sensitivity analysis", { timeout: 300000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("RANDOM TOPOLOGY OPTIMIZATION & SENSITIVITY ANALYSIS");
  console.log("=".repeat(80));

  // Generate random trebuchets
  const numTrebuchets = 10;
  const randomTrebuchets = generateRandomTrebuchets(numTrebuchets, 42);

  const results = [];

  for (const { id, config } of randomTrebuchets) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`Processing: ${id}`);
    console.log(`${"─".repeat(80)}`);

    // Measure initial sensitivity
    console.log("  [1/3] Measuring initial sensitivity...");
    const initialSensitivity = measureSensitivity(config, 0.01, 3);

    if (initialSensitivity.error) {
      console.log(`  ❌ Error: ${initialSensitivity.error}`);
      results.push({
        id,
        error: initialSensitivity.error,
      });
      continue;
    }

    console.log(
      `    Initial Range: ${initialSensitivity.baselineRange.toFixed(2)}`
    );
    console.log(
      `    Initial Growth Rate: ${initialSensitivity.avgGrowthRate.toFixed(6)}`
    );
    console.log(
      `    Initial Max Divergence: ${initialSensitivity.avgMaxDivergence.toFixed(3)}`
    );

    // Optimize for range
    console.log("  [2/3] Optimizing for range...");
    const optimizationResult = optimizeRange(config, {
      maxIterations: 30,
      stepSize: 2.0,
      convergenceThreshold: 0.1,
      verboseLogging: false,
    });

    if (!optimizationResult.success) {
      console.log("  ❌ Optimization failed");
      results.push({
        id,
        error: "Optimization failed",
      });
      continue;
    }

    console.log(
      `    Optimized Range: ${optimizationResult.finalRange.toFixed(2)} (+${optimizationResult.improvementPercent.toFixed(1)}%)`
    );

    // Measure post-optimization sensitivity
    console.log("  [3/3] Measuring post-optimization sensitivity...");
    const finalSensitivity = measureSensitivity(
      optimizationResult.optimizedConfig,
      0.01,
      3
    );

    if (finalSensitivity.error) {
      console.log(`  ❌ Error: ${finalSensitivity.error}`);
      results.push({
        id,
        error: finalSensitivity.error,
      });
      continue;
    }

    console.log(
      `    Final Growth Rate: ${finalSensitivity.avgGrowthRate.toFixed(6)}`
    );
    console.log(
      `    Final Max Divergence: ${finalSensitivity.avgMaxDivergence.toFixed(3)}`
    );

    const sensitivityChange =
      ((finalSensitivity.avgGrowthRate - initialSensitivity.avgGrowthRate) /
        initialSensitivity.avgGrowthRate) *
      100;

    console.log(
      `    Sensitivity Change: ${sensitivityChange > 0 ? "+" : ""}${sensitivityChange.toFixed(1)}%`
    );

    results.push({
      id,
      initialRange: initialSensitivity.baselineRange,
      finalRange: finalSensitivity.baselineRange,
      rangeImprovement: optimizationResult.improvementPercent,
      initialGrowthRate: initialSensitivity.avgGrowthRate,
      finalGrowthRate: finalSensitivity.avgGrowthRate,
      growthRateChange: sensitivityChange,
      initialMaxDivergence: initialSensitivity.avgMaxDivergence,
      finalMaxDivergence: finalSensitivity.avgMaxDivergence,
      iterations: optimizationResult.iterations,
    });
  }

  // Generate summary report
  console.log("\n\n" + "=".repeat(80));
  console.log("SUMMARY REPORT");
  console.log("=".repeat(80));

  const successfulResults = results.filter((r) => !r.error);

  if (successfulResults.length === 0) {
    console.log("❌ No successful optimizations");
    expect(successfulResults.length).toBeGreaterThan(0);
    return;
  }

  console.log(`\nSuccessful optimizations: ${successfulResults.length}/${numTrebuchets}\n`);

  // Summary statistics
  const avgRangeImprovement =
    successfulResults.reduce((sum, r) => sum + r.rangeImprovement, 0) /
    successfulResults.length;
  const avgSensitivityChange =
    successfulResults.reduce((sum, r) => sum + r.growthRateChange, 0) /
    successfulResults.length;

  const sensitivityIncreased = successfulResults.filter(
    (r) => r.growthRateChange > 5
  ).length;
  const sensitivityDecreased = successfulResults.filter(
    (r) => r.growthRateChange < -5
  ).length;
  const sensitivityUnchanged = successfulResults.filter(
    (r) => Math.abs(r.growthRateChange) <= 5
  ).length;

  console.log("Overall Statistics:");
  console.log(`  Average Range Improvement: +${avgRangeImprovement.toFixed(1)}%`);
  console.log(
    `  Average Sensitivity Change: ${avgSensitivityChange > 0 ? "+" : ""}${avgSensitivityChange.toFixed(1)}%`
  );
  console.log(`  Sensitivity Increased (>5%): ${sensitivityIncreased}`);
  console.log(`  Sensitivity Decreased (<-5%): ${sensitivityDecreased}`);
  console.log(`  Sensitivity Unchanged (±5%): ${sensitivityUnchanged}`);

  console.log("\n" + "─".repeat(80));
  console.log("Individual Results:");
  console.log("─".repeat(80));

  // Sort by sensitivity change
  const sortedResults = [...successfulResults].sort(
    (a, b) => b.growthRateChange - a.growthRateChange
  );

  console.log(
    "\nRanked by Sensitivity Change (Most Increased to Most Decreased):\n"
  );

  sortedResults.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.id}`);
    console.log(
      `   Range: ${result.initialRange.toFixed(2)} → ${result.finalRange.toFixed(2)} (+${result.rangeImprovement.toFixed(1)}%)`
    );
    console.log(
      `   Growth Rate: ${result.initialGrowthRate.toFixed(6)} → ${result.finalGrowthRate.toFixed(6)} (${result.growthRateChange > 0 ? "+" : ""}${result.growthRateChange.toFixed(1)}%)`
    );
    console.log(
      `   Max Divergence: ${result.initialMaxDivergence.toFixed(3)} → ${result.finalMaxDivergence.toFixed(3)}`
    );
    console.log("");
  });

  console.log("=".repeat(80));
  console.log("KEY FINDINGS:");
  console.log("=".repeat(80));

  if (avgSensitivityChange > 5) {
    console.log(
      "✓ Range optimization tends to INCREASE sensitivity to initial conditions"
    );
    console.log(
      "  This suggests a tradeoff between performance and robustness."
    );
  } else if (avgSensitivityChange < -5) {
    console.log(
      "✓ Range optimization tends to DECREASE sensitivity to initial conditions"
    );
    console.log("  Optimized designs are both better performing and more robust!");
  } else {
    console.log(
      "✓ Range optimization has MIXED effects on sensitivity"
    );
    console.log("  The relationship varies by design configuration.");
  }

  console.log(
    `\n✓ On average, optimization improved range by ${avgRangeImprovement.toFixed(1)}%`
  );

  console.log("=".repeat(80));

  // Store results globally for further analysis
  globalThis.optimizationResults = results;

  // Validation checks
  expect(successfulResults.length).toBeGreaterThan(0);
  expect(avgRangeImprovement).toBeGreaterThan(-10); // Allow some failures
});
