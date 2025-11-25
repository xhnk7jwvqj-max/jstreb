import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculateRange,
  calculatePeakLoad,
  presets,
} from "./trebuchetsimulation.js";
import * as fs from "fs";

/**
 * Analyze forces and performance for a configuration
 */
function analyzeForces(name, configJson) {
  const data = JSON.parse(configJson);
  fillEmptyConstraints(data);

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
    const [trajectories, constraintLog, forceLog] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );

    if (trajectories.length === 0) {
      return { error: "Simulation failed" };
    }

    const range = calculateRange(trajectories, data);
    const peakLoad = calculatePeakLoad(forceLog);

    // Calculate total mass
    const totalMass = data.particles.reduce((sum, p) => sum + p.mass, 0);

    // Calculate average force over time
    const avgForces = [];
    for (let i = 1; i < forceLog.length; i++) {
      const timestepForces = forceLog[i];
      const avgForce =
        timestepForces.reduce((sum, f) => sum + Math.abs(f), 0) /
        timestepForces.length;
      avgForces.push(avgForce);
    }
    const avgLoad =
      avgForces.reduce((sum, f) => sum + f, 0) / avgForces.length;

    // Find peak force timing
    let peakTime = 0;
    let maxForce = 0;
    for (let i = 1; i < forceLog.length; i++) {
      const maxAtTime = Math.max(
        ...forceLog[i].map((f) => Math.abs(f))
      );
      if (maxAtTime > maxForce) {
        maxForce = maxAtTime;
        peakTime = i * data.timestep;
      }
    }

    // Calculate force statistics
    const allForces = [];
    for (let i = 1; i < forceLog.length; i++) {
      forceLog[i].forEach((f) => allForces.push(Math.abs(f)));
    }
    allForces.sort((a, b) => a - b);
    const medianForce = allForces[Math.floor(allForces.length / 2)];
    const p95Force = allForces[Math.floor(allForces.length * 0.95)];

    return {
      name,
      range,
      peakLoad,
      avgLoad,
      medianForce,
      p95Force,
      peakTime,
      totalMass,
      numParticles: data.particles.length,
      numConstraints:
        (data.constraints.rod?.length || 0) +
        (data.constraints.slider?.length || 0) +
        (data.constraints.pin?.length || 0) +
        (data.constraints.rope?.length || 0),
      forcePerMass: peakLoad / totalMass,
      rangePerForce: range / peakLoad,
      simulationLength: trajectories.length,
    };
  } catch (error) {
    return { error: error.message };
  }
}

test("force analysis - champion vs presets", { timeout: 300000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("FORCE ANALYSIS: Champion vs. Preset Topologies");
  console.log("=".repeat(80));
  console.log("\nQuestion: Does the champion's superior performance come with");
  console.log("          higher mechanical forces (harder to build)?");
  console.log("\n" + "=".repeat(80));

  // Load champion topology
  const championData = JSON.parse(
    fs.readFileSync("/home/user/jstreb/extended-search-results.json", "utf8")
  );
  const championConfig = championData.bestTopology.config;
  const championJson = JSON.stringify(championConfig);

  console.log("\n[1/2] Analyzing champion forces...");
  const championResult = analyzeForces("Champion (Discovered)", championJson);

  if (championResult.error) {
    console.log(`❌ Error: ${championResult.error}`);
    return;
  }

  console.log(`  Range: ${championResult.range.toFixed(2)}`);
  console.log(`  Peak Load: ${championResult.peakLoad.toFixed(2)} lbf`);
  console.log(`  Avg Load: ${championResult.avgLoad.toFixed(2)} lbf`);
  console.log(`  Peak Time: ${championResult.peakTime.toFixed(2)}s`);

  console.log("\n[2/2] Analyzing preset forces...");

  const presetResults = [];
  for (const [name, json] of Object.entries(presets)) {
    const result = analyzeForces(name, json);
    if (!result.error) {
      presetResults.push(result);
    }
  }

  console.log(`  Analyzed ${presetResults.length} presets`);

  // Combine all results
  const allResults = [championResult, ...presetResults];

  // Generate comparative report
  console.log("\n" + "=".repeat(80));
  console.log("FORCE COMPARISON ANALYSIS");
  console.log("=".repeat(80));

  // Sort by peak load
  const byForce = [...allResults].sort((a, b) => b.peakLoad - a.peakLoad);

  console.log("\n1. RANKED BY PEAK FORCE (Highest to Lowest):\n");
  byForce.forEach((r, idx) => {
    const isChampion = r.name === "Champion (Discovered)";
    const marker = isChampion ? "🏆" : "  ";
    console.log(
      `${marker}${idx + 1}. ${r.name.padEnd(30)} Force: ${r.peakLoad.toFixed(2).padStart(10)} lbf | Range: ${r.range.toFixed(2)}`
    );
  });

  // Sort by performance
  const byPerformance = [...allResults].sort((a, b) => b.range - a.range);

  console.log("\n2. RANKED BY PERFORMANCE (Range):\n");
  byPerformance.forEach((r, idx) => {
    const isChampion = r.name === "Champion (Discovered)";
    const marker = isChampion ? "🏆" : "  ";
    console.log(
      `${marker}${idx + 1}. ${r.name.padEnd(30)} Range: ${r.range.toFixed(2).padStart(10)} | Force: ${r.peakLoad.toFixed(2)} lbf`
    );
  });

  // Efficiency: Range per unit force
  const byEfficiency = [...allResults].sort(
    (a, b) => b.rangePerForce - a.rangePerForce
  );

  console.log("\n3. RANKED BY EFFICIENCY (Range per unit Force):\n");
  byEfficiency.forEach((r, idx) => {
    const isChampion = r.name === "Champion (Discovered)";
    const marker = isChampion ? "🏆" : "  ";
    console.log(
      `${marker}${idx + 1}. ${r.name.padEnd(30)} Efficiency: ${r.rangePerForce.toFixed(3).padStart(8)} ft/lbf`
    );
  });

  // Statistical analysis
  console.log("\n" + "=".repeat(80));
  console.log("STATISTICAL ANALYSIS");
  console.log("=".repeat(80));

  const championForceRank =
    byForce.findIndex((r) => r.name === "Champion (Discovered)") + 1;
  const championPerformanceRank =
    byPerformance.findIndex((r) => r.name === "Champion (Discovered)") + 1;
  const championEfficiencyRank =
    byEfficiency.findIndex((r) => r.name === "Champion (Discovered)") + 1;

  console.log(`\nChampion Rankings:`);
  console.log(`  Performance: ${championPerformanceRank}/${allResults.length} (${championPerformanceRank === 1 ? "BEST" : ""})`);
  console.log(`  Peak Force: ${championForceRank}/${allResults.length} (${championForceRank === 1 ? "Highest forces" : championForceRank <= 3 ? "High forces" : championForceRank >= allResults.length - 2 ? "Low forces" : "Moderate forces"})`);
  console.log(`  Efficiency: ${championEfficiencyRank}/${allResults.length} (${championEfficiencyRank === 1 ? "BEST" : championEfficiencyRank <= 3 ? "Top tier" : ""})`);

  // Correlation between force and performance
  const ranges = allResults.map((r) => r.range);
  const forces = allResults.map((r) => r.peakLoad);

  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  const avgForce = forces.reduce((a, b) => a + b, 0) / forces.length;

  let numerator = 0;
  let sumSqRange = 0;
  let sumSqForce = 0;

  for (let i = 0; i < allResults.length; i++) {
    const rangeDev = ranges[i] - avgRange;
    const forceDev = forces[i] - avgForce;
    numerator += rangeDev * forceDev;
    sumSqRange += rangeDev * rangeDev;
    sumSqForce += forceDev * forceDev;
  }

  const correlation = numerator / Math.sqrt(sumSqRange * sumSqForce);

  console.log(`\nCorrelation (Performance vs Force):`);
  console.log(`  Pearson r = ${correlation.toFixed(3)}`);

  if (correlation > 0.5) {
    console.log(`  → STRONG POSITIVE: Higher range requires higher forces`);
  } else if (correlation > 0.2) {
    console.log(`  → MODERATE POSITIVE: Some correlation`);
  } else if (correlation > -0.2) {
    console.log(`  → WEAK/NO CORRELATION: Force and range are independent`);
  } else {
    console.log(`  → NEGATIVE: Higher range with LOWER forces (efficient!)`);
  }

  // Detailed champion analysis
  console.log("\n" + "=".repeat(80));
  console.log("CHAMPION FORCE ANALYSIS");
  console.log("=".repeat(80));

  console.log(`\nForce characteristics:`);
  console.log(`  Peak Load: ${championResult.peakLoad.toFixed(2)} lbf`);
  console.log(`  Average Load: ${championResult.avgLoad.toFixed(2)} lbf`);
  console.log(`  Median Force: ${championResult.medianForce.toFixed(2)} lbf`);
  console.log(`  95th Percentile: ${championResult.p95Force.toFixed(2)} lbf`);
  console.log(`  Peak at: ${championResult.peakTime.toFixed(2)}s`);

  console.log(`\nMechanical properties:`);
  console.log(`  Total Mass: ${championResult.totalMass.toFixed(1)} kg`);
  console.log(`  Force per Mass: ${championResult.forcePerMass.toFixed(2)} lbf/kg`);
  console.log(`  Range per Force: ${championResult.rangePerForce.toFixed(3)} ft/lbf`);

  // Compare with extremes
  const maxForceDesign = byForce[0];
  const minForceDesign = byForce[byForce.length - 1];
  const bestPreset = presetResults.reduce(
    (best, r) => (r.range > best.range ? r : best),
    presetResults[0]
  );

  console.log(`\nComparisons:`);
  console.log(`  vs. Highest Force (${maxForceDesign.name}):`);
  console.log(`    Champion: ${championResult.peakLoad.toFixed(2)} lbf`);
  console.log(`    ${maxForceDesign.name}: ${maxForceDesign.peakLoad.toFixed(2)} lbf`);
  console.log(
    `    Difference: ${((championResult.peakLoad / maxForceDesign.peakLoad - 1) * 100).toFixed(1)}%`
  );

  console.log(`\n  vs. Best Preset (${bestPreset.name}):`);
  console.log(`    Champion: ${championResult.peakLoad.toFixed(2)} lbf`);
  console.log(`    ${bestPreset.name}: ${bestPreset.peakLoad.toFixed(2)} lbf`);
  console.log(
    `    Difference: ${((championResult.peakLoad / bestPreset.peakLoad - 1) * 100).toFixed(1)}%`
  );
  console.log(`\n    Range improvement: +${((championResult.range / bestPreset.range - 1) * 100).toFixed(1)}%`);
  console.log(`    Force increase: +${((championResult.peakLoad / bestPreset.peakLoad - 1) * 100).toFixed(1)}%`);

  // Force-to-benefit ratio
  const forceIncrease = championResult.peakLoad / bestPreset.peakLoad;
  const rangeIncrease = championResult.range / bestPreset.range;
  const costBenefitRatio = forceIncrease / rangeIncrease;

  console.log(`\n  Cost-Benefit Analysis:`);
  console.log(`    Range gain: ${rangeIncrease.toFixed(2)}x`);
  console.log(`    Force cost: ${forceIncrease.toFixed(2)}x`);
  console.log(`    Ratio: ${costBenefitRatio.toFixed(3)} (force cost per unit range gain)`);

  if (costBenefitRatio < 0.5) {
    console.log(`    → EXCELLENT: Much more range for little force increase`);
  } else if (costBenefitRatio < 1.0) {
    console.log(`    → GOOD: Range gains exceed force costs`);
  } else if (costBenefitRatio < 1.5) {
    console.log(`    → FAIR: Proportional tradeoff`);
  } else {
    console.log(`    → POOR: High force cost for range gain`);
  }

  // Conclusions
  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSIONS");
  console.log("=".repeat(80));

  if (championForceRank === 1) {
    console.log("\n✗ FORCE PENALTY: Champion has HIGHEST forces");
    console.log("  Superior performance requires stronger construction.");
  } else if (championForceRank <= 3) {
    console.log("\n○ MODERATE FORCE PENALTY: Champion has high forces");
    console.log("  Performance gain comes with increased structural demands.");
  } else if (championForceRank >= allResults.length - 2) {
    console.log("\n✓ NO FORCE PENALTY: Champion has LOW forces!");
    console.log("  Superior performance WITHOUT extreme structural demands!");
  } else {
    console.log("\n○ BALANCED: Champion has moderate forces");
    console.log("  Performance advantage does not require extreme forces.");
  }

  if (championEfficiencyRank === 1) {
    console.log("\n✓ MOST EFFICIENT: Champion has best range-per-force ratio!");
    console.log("  Gets more performance for less structural stress.");
  } else if (championEfficiencyRank <= 3) {
    console.log("\n✓ HIGHLY EFFICIENT: Champion in top 3 for range-per-force");
  }

  if (costBenefitRatio < 1.0) {
    console.log(`\n✓ EXCELLENT TRADEOFF: ${rangeIncrease.toFixed(2)}x range for only ${forceIncrease.toFixed(2)}x force`);
    console.log("  Performance gains exceed structural cost increases.");
  }

  console.log("\n" + "=".repeat(80));

  // Save results
  const outputData = {
    champion: championResult,
    presets: presetResults,
    rankings: {
      championForceRank,
      championPerformanceRank,
      championEfficiencyRank,
    },
    statistics: {
      correlation,
      costBenefitRatio,
      forceIncrease,
      rangeIncrease,
    },
    comparisons: {
      maxForceDesign: maxForceDesign.name,
      maxForce: maxForceDesign.peakLoad,
      minForceDesign: minForceDesign.name,
      minForce: minForceDesign.peakLoad,
      bestPreset: bestPreset.name,
      bestPresetForce: bestPreset.peakLoad,
      bestPresetRange: bestPreset.range,
    },
  };

  fs.writeFileSync(
    "/home/user/jstreb/force-analysis-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("✓ Results saved to force-analysis-results.json\n");

  // Validation
  expect(championResult).toBeDefined();
  expect(championResult.peakLoad).toBeGreaterThan(0);
  expect(presetResults.length).toBeGreaterThan(0);
});
