import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange, presets } from "./trebuchetsimulation.js";
import * as fs from "fs";

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
 * Calculate velocity divergence between two states
 */
function calculateVelocityDivergence(state1, state2, numParticles) {
  let sumSquares = 0;
  const offset = 2 * numParticles;
  for (let i = 0; i < 2 * numParticles; i++) {
    const diff = state1[offset + i] - state2[offset + i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

/**
 * Perform sensitivity analysis on a preset
 */
function analyzeSensitivity(presetName, presetJson, perturbationSize = 0.01) {
  const data = JSON.parse(presetJson);
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

    // Test multiple perturbations
    const numPerturbations = 5;
    const results = [];

    for (let perturbIdx = 0; perturbIdx < numPerturbations; perturbIdx++) {
      // Create perturbed particles
      const perturbedParticles = data.particles.map((p) => ({
        ...p,
        x: p.x + (Math.random() - 0.5) * 2 * perturbationSize,
        y: p.y + (Math.random() - 0.5) * 2 * perturbationSize,
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

      // Calculate divergence at each time step
      const minLength = Math.min(
        baselineTrajectories.length,
        perturbedTrajectories.length
      );
      const divergences = [];
      const velocityDivergences = [];

      for (let i = 0; i < minLength; i++) {
        const posDiv = calculateStateDistance(
          baselineTrajectories[i],
          perturbedTrajectories[i],
          numParticles
        );
        const velDiv = calculateVelocityDivergence(
          baselineTrajectories[i],
          perturbedTrajectories[i],
          numParticles
        );
        divergences.push(posDiv);
        velocityDivergences.push(velDiv);
      }

      // Calculate metrics
      const maxDivergence = Math.max(...divergences);
      const finalDivergence = divergences[divergences.length - 1];
      const avgDivergence =
        divergences.reduce((a, b) => a + b, 0) / divergences.length;

      // Calculate exponential growth rate
      const initialDiv = divergences[0];
      let growthRate = 0;
      let doubling_time = null;

      if (initialDiv > 1e-10) {
        for (let i = 1; i < divergences.length; i++) {
          if (divergences[i] > 2 * initialDiv && doubling_time === null) {
            doubling_time = i * data.timestep;
          }
        }

        if (finalDivergence > initialDiv && divergences.length > 1) {
          const timeSpan = (divergences.length - 1) * data.timestep;
          growthRate = Math.log(finalDivergence / initialDiv) / timeSpan;
        }
      }

      results.push({
        initialDivergence: initialDiv,
        maxDivergence,
        finalDivergence,
        avgDivergence,
        growthRate,
        doubling_time,
        trajectoryLength: divergences.length,
        finalVelocityDivergence:
          velocityDivergences[velocityDivergences.length - 1],
        rangeDifference: Math.abs(perturbedRange - baselineRange),
      });
    }

    if (results.length === 0) {
      return { error: "All perturbations failed" };
    }

    // Aggregate results across perturbations
    const avgMaxDivergence =
      results.reduce((sum, r) => sum + r.maxDivergence, 0) / results.length;
    const avgFinalDivergence =
      results.reduce((sum, r) => sum + r.finalDivergence, 0) / results.length;
    const avgGrowthRate =
      results.reduce((sum, r) => sum + r.growthRate, 0) / results.length;
    const avgDoublingTime =
      results
        .filter((r) => r.doubling_time !== null)
        .reduce((sum, r) => sum + r.doubling_time, 0) /
      Math.max(1, results.filter((r) => r.doubling_time !== null).length);
    const avgRangeDifference =
      results.reduce((sum, r) => sum + r.rangeDifference, 0) / results.length;

    return {
      presetName,
      baselineRange,
      perturbationSize,
      numPerturbations: results.length,
      avgMaxDivergence,
      avgFinalDivergence,
      avgGrowthRate,
      avgDoublingTime: isNaN(avgDoublingTime) ? null : avgDoublingTime,
      avgRangeDifference,
      baselineTrajectoryLength: baselineTrajectories.length,
      individualResults: results,
    };
  } catch (error) {
    return { error: error.message };
  }
}

test("champion topology sensitivity analysis", { timeout: 300000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("CHAMPION TOPOLOGY SENSITIVITY ANALYSIS");
  console.log("=".repeat(80));
  console.log("\nQuestion: Is the champion's superior performance accompanied by");
  console.log("          higher sensitivity to initial conditions?");
  console.log("\n" + "=".repeat(80));

  // Load champion topology
  const championData = JSON.parse(
    fs.readFileSync("/home/user/jstreb/extended-search-results.json", "utf8")
  );
  const championConfig = championData.bestTopology.config;
  const championJson = JSON.stringify(championConfig);

  console.log("\n[1/2] Analyzing champion topology sensitivity...");
  const championResult = analyzeSensitivity(
    "Champion (Discovered)",
    championJson
  );

  if (championResult.error) {
    console.log(`❌ Error: ${championResult.error}`);
    return;
  }

  console.log(`  Range: ${championResult.baselineRange.toFixed(2)}`);
  console.log(`  Growth Rate: ${championResult.avgGrowthRate.toFixed(6)}`);
  console.log(`  Max Divergence: ${championResult.avgMaxDivergence.toFixed(3)}`);
  console.log(
    `  Range Variation: ±${championResult.avgRangeDifference.toFixed(2)}`
  );

  console.log("\n[2/2] Analyzing all preset topologies for comparison...");

  const presetResults = [];
  for (const [name, json] of Object.entries(presets)) {
    const result = analyzeSensitivity(name, json);
    if (!result.error) {
      presetResults.push(result);
    }
  }

  console.log(`  Analyzed ${presetResults.length} presets`);

  // Combine all results
  const allResults = [championResult, ...presetResults];

  // Generate comparative report
  console.log("\n" + "=".repeat(80));
  console.log("COMPARATIVE SENSITIVITY ANALYSIS");
  console.log("=".repeat(80));

  // Sort by range (performance)
  const byPerformance = [...allResults].sort(
    (a, b) => b.baselineRange - a.baselineRange
  );

  console.log("\n1. RANKED BY PERFORMANCE (Range):\n");
  byPerformance.forEach((r, idx) => {
    const isChampion = r.presetName === "Champion (Discovered)";
    const marker = isChampion ? "🏆" : "  ";
    console.log(
      `${marker}${idx + 1}. ${r.presetName.padEnd(30)} Range: ${r.baselineRange.toFixed(2).padStart(10)} | GR: ${r.avgGrowthRate.toFixed(6)}`
    );
  });

  // Sort by sensitivity (growth rate)
  const bySensitivity = [...allResults].sort(
    (a, b) => b.avgGrowthRate - a.avgGrowthRate
  );

  console.log("\n2. RANKED BY SENSITIVITY (Growth Rate - Most to Least Sensitive):\n");
  bySensitivity.forEach((r, idx) => {
    const isChampion = r.presetName === "Champion (Discovered)";
    const marker = isChampion ? "🏆" : "  ";
    console.log(
      `${marker}${idx + 1}. ${r.presetName.padEnd(30)} GR: ${r.avgGrowthRate.toFixed(6).padStart(10)} | Range: ${r.baselineRange.toFixed(2)}`
    );
  });

  // Performance-Sensitivity correlation
  console.log("\n" + "=".repeat(80));
  console.log("PERFORMANCE vs. SENSITIVITY ANALYSIS");
  console.log("=".repeat(80));

  const championPerformanceRank =
    byPerformance.findIndex((r) => r.presetName === "Champion (Discovered)") +
    1;
  const championSensitivityRank =
    bySensitivity.findIndex((r) => r.presetName === "Champion (Discovered)") +
    1;

  console.log(`\nChampion Position:`);
  console.log(`  Performance rank: ${championPerformanceRank}/${allResults.length} (${championPerformanceRank === 1 ? "BEST" : ""})`);
  console.log(
    `  Sensitivity rank: ${championSensitivityRank}/${allResults.length} (${championSensitivityRank === 1 ? "Most sensitive" : championSensitivityRank === allResults.length ? "Least sensitive" : championSensitivityRank <= 3 ? "High sensitivity" : championSensitivityRank >= allResults.length - 2 ? "Low sensitivity" : "Moderate sensitivity"})`
  );

  // Statistical correlation
  const ranges = allResults.map((r) => r.baselineRange);
  const growthRates = allResults.map((r) => r.avgGrowthRate);

  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  const avgGR = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;

  let numerator = 0;
  let sumSqRange = 0;
  let sumSqGR = 0;

  for (let i = 0; i < allResults.length; i++) {
    const rangeDev = ranges[i] - avgRange;
    const grDev = growthRates[i] - avgGR;
    numerator += rangeDev * grDev;
    sumSqRange += rangeDev * rangeDev;
    sumSqGR += grDev * grDev;
  }

  const correlation = numerator / Math.sqrt(sumSqRange * sumSqGR);

  console.log(`\nCorrelation between Performance and Sensitivity:`);
  console.log(`  Pearson r = ${correlation.toFixed(3)}`);

  if (correlation > 0.5) {
    console.log(
      `  → STRONG POSITIVE: Higher performance correlates with higher sensitivity`
    );
  } else if (correlation > 0.2) {
    console.log(
      `  → MODERATE POSITIVE: Some correlation between performance and sensitivity`
    );
  } else if (correlation > -0.2) {
    console.log(`  → WEAK/NO CORRELATION: Performance and sensitivity are independent`);
  } else if (correlation > -0.5) {
    console.log(
      `  → MODERATE NEGATIVE: Higher performance correlates with lower sensitivity`
    );
  } else {
    console.log(
      `  → STRONG NEGATIVE: Higher performance correlates with lower sensitivity`
    );
  }

  // Detailed champion analysis
  console.log("\n" + "=".repeat(80));
  console.log("CHAMPION TOPOLOGY DETAILED ANALYSIS");
  console.log("=".repeat(80));

  console.log(`\nPerformance:`);
  console.log(`  Range: ${championResult.baselineRange.toFixed(2)}`);
  const bestPreset = presetResults.reduce(
    (best, r) => (r.baselineRange > best.baselineRange ? r : best),
    presetResults[0]
  );
  const improvementVsBest =
    ((championResult.baselineRange - bestPreset.baselineRange) /
      bestPreset.baselineRange) *
    100;
  console.log(`  vs. Best Preset (${bestPreset.presetName}): +${improvementVsBest.toFixed(1)}%`);

  console.log(`\nSensitivity:`);
  console.log(`  Growth Rate: ${championResult.avgGrowthRate.toFixed(6)}`);
  console.log(`  Max Divergence: ${championResult.avgMaxDivergence.toFixed(3)}`);
  console.log(
    `  Doubling Time: ${championResult.avgDoublingTime ? championResult.avgDoublingTime.toFixed(2) + "s" : "N/A"}`
  );
  console.log(`  Range Variation: ±${championResult.avgRangeDifference.toFixed(2)} (${((championResult.avgRangeDifference / championResult.baselineRange) * 100).toFixed(2)}%)`);

  // Compare with most and least sensitive presets
  const mostSensitive = presetResults.reduce(
    (max, r) => (r.avgGrowthRate > max.avgGrowthRate ? r : max),
    presetResults[0]
  );
  const leastSensitive = presetResults.reduce(
    (min, r) => (r.avgGrowthRate < min.avgGrowthRate ? r : min),
    presetResults[0]
  );

  console.log(`\nComparison with extremes:`);
  console.log(
    `  Most Sensitive Preset: ${mostSensitive.presetName} (GR: ${mostSensitive.avgGrowthRate.toFixed(6)})`
  );
  console.log(
    `  Champion: (GR: ${championResult.avgGrowthRate.toFixed(6)})`
  );
  console.log(
    `  Least Sensitive Preset: ${leastSensitive.presetName} (GR: ${leastSensitive.avgGrowthRate.toFixed(6)})`
  );

  const sensitivityVsMost =
    ((championResult.avgGrowthRate - mostSensitive.avgGrowthRate) /
      mostSensitive.avgGrowthRate) *
    100;
  const sensitivityVsLeast =
    ((championResult.avgGrowthRate - leastSensitive.avgGrowthRate) /
      leastSensitive.avgGrowthRate) *
    100;

  console.log(
    `  vs. Most Sensitive: ${sensitivityVsMost > 0 ? "+" : ""}${sensitivityVsMost.toFixed(1)}%`
  );
  console.log(
    `  vs. Least Sensitive: ${sensitivityVsLeast > 0 ? "+" : ""}${sensitivityVsLeast.toFixed(1)}%`
  );

  // Conclusions
  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSIONS");
  console.log("=".repeat(80));

  if (championSensitivityRank === 1) {
    console.log("\n✗ TRADEOFF CONFIRMED: Champion is the MOST sensitive design");
    console.log("  Peak performance comes at the cost of increased sensitivity.");
  } else if (championSensitivityRank <= 3) {
    console.log("\n○ TRADEOFF PRESENT: Champion has high sensitivity");
    console.log("  Superior performance is accompanied by above-average sensitivity.");
  } else if (championSensitivityRank >= allResults.length - 2) {
    console.log("\n✓ NO TRADEOFF: Champion has LOW sensitivity!");
    console.log("  High performance WITHOUT sensitivity penalty - best of both worlds!");
  } else {
    console.log("\n○ BALANCED: Champion has moderate sensitivity");
    console.log(
      "  Performance advantage does not come with extreme sensitivity cost."
    );
  }

  if (Math.abs(correlation) < 0.3) {
    console.log(
      "\n✓ Performance and sensitivity are largely INDEPENDENT across designs"
    );
    console.log("  High performance does not necessarily mean high sensitivity.");
  } else if (correlation > 0) {
    console.log(`\n○ Positive correlation (r=${correlation.toFixed(3)}): Better designs tend to be more sensitive`);
  } else {
    console.log(
      `\n✓ Negative correlation (r=${correlation.toFixed(3)}): Better designs tend to be MORE STABLE!`
    );
  }

  console.log("\n" + "=".repeat(80));

  // Save results
  const outputData = {
    champion: championResult,
    presets: presetResults,
    summary: {
      championPerformanceRank,
      championSensitivityRank,
      totalDesigns: allResults.length,
      correlation,
      improvementVsBestPreset: improvementVsBest,
      sensitivityVsMostSensitive: sensitivityVsMost,
      sensitivityVsLeastSensitive: sensitivityVsLeast,
    },
  };

  fs.writeFileSync(
    "/home/user/jstreb/champion-sensitivity-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("✓ Results saved to champion-sensitivity-results.json\n");

  // Validation
  expect(championResult).toBeDefined();
  expect(championResult.avgGrowthRate).toBeGreaterThanOrEqual(0);
  expect(presetResults.length).toBeGreaterThan(0);
});
