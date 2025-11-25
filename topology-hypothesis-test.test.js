import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange } from "./trebuchetsimulation.js";
import { generateRandomTrebuchets } from "./random-topology-generator.js";
import {
  generateArbitraryTrebuchets,
  generateSemiStructuredTrebuchets,
} from "./arbitrary-topology-generator.js";
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
 * Measure sensitivity to initial conditions
 */
function measureSensitivity(data, perturbationSize = 0.01, numPerturbations = 3) {
  fillEmptyConstraints(data);
  const numParticles = data.particles.length;

  function terminate(trajectories) {
    if (trajectories.length === 0) return false;
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  try {
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

    const results = [];

    for (let perturbIdx = 0; perturbIdx < numPerturbations; perturbIdx++) {
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

      const [perturbedTrajectories] = simulate(
        perturbedParticles,
        data.constraints,
        data.timestep,
        data.duration,
        terminate
      );

      if (perturbedTrajectories.length === 0) continue;

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

      let growthRate = 0;
      if (finalDivergence > initialDiv && divergences.length > 1) {
        const timeSpan = (divergences.length - 1) * data.timestep;
        growthRate = Math.log(finalDivergence / initialDiv) / timeSpan;
      }

      results.push({ maxDivergence, finalDivergence, growthRate });
    }

    if (results.length === 0) {
      return { error: "All perturbations failed" };
    }

    const avgGrowthRate =
      results.reduce((sum, r) => sum + r.growthRate, 0) / results.length;
    const avgMaxDivergence =
      results.reduce((sum, r) => sum + r.maxDivergence, 0) / results.length;

    return {
      baselineRange,
      avgGrowthRate,
      avgMaxDivergence,
      numSuccessful: results.length,
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Process a single topology through optimization and sensitivity testing
 */
function processTopology(id, config, topologyType) {
  console.log(`\n  ${id}`);

  // Initial sensitivity
  const initialSensitivity = measureSensitivity(config, 0.01, 3);

  if (initialSensitivity.error) {
    console.log(`    ❌ Initial: ${initialSensitivity.error}`);
    return { id, topologyType, error: initialSensitivity.error };
  }

  console.log(
    `    Initial: Range=${initialSensitivity.baselineRange.toFixed(2)}, GR=${initialSensitivity.avgGrowthRate.toFixed(4)}`
  );

  // Optimize
  const optimizationResult = optimizeRange(config, {
    maxIterations: 30,
    stepSize: 2.0,
    convergenceThreshold: 0.1,
    verboseLogging: false,
  });

  if (!optimizationResult.success) {
    console.log(`    ❌ Optimization failed`);
    return { id, topologyType, error: "Optimization failed" };
  }

  console.log(
    `    Optimized: Range=${optimizationResult.finalRange.toFixed(2)} (+${optimizationResult.improvementPercent.toFixed(1)}%)`
  );

  // Final sensitivity
  const finalSensitivity = measureSensitivity(
    optimizationResult.optimizedConfig,
    0.01,
    3
  );

  if (finalSensitivity.error) {
    console.log(`    ❌ Final: ${finalSensitivity.error}`);
    return { id, topologyType, error: finalSensitivity.error };
  }

  const sensitivityChange =
    ((finalSensitivity.avgGrowthRate - initialSensitivity.avgGrowthRate) /
      initialSensitivity.avgGrowthRate) *
    100;

  console.log(
    `    Final: GR=${finalSensitivity.avgGrowthRate.toFixed(4)} (${sensitivityChange > 0 ? "+" : ""}${sensitivityChange.toFixed(1)}%)`
  );

  return {
    id,
    topologyType,
    initialRange: initialSensitivity.baselineRange,
    finalRange: finalSensitivity.baselineRange,
    rangeImprovement: optimizationResult.improvementPercent,
    initialGrowthRate: initialSensitivity.avgGrowthRate,
    finalGrowthRate: finalSensitivity.avgGrowthRate,
    growthRateChange: sensitivityChange,
    initialMaxDivergence: initialSensitivity.avgMaxDivergence,
    finalMaxDivergence: finalSensitivity.avgMaxDivergence,
    numParticles: config.particles.length,
    numRods: config.constraints.rod?.length || 0,
    numSliders: config.constraints.slider?.length || 0,
  };
}

test("topology type hypothesis test", { timeout: 600000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("HYPOTHESIS TEST: Do different topology types behave differently?");
  console.log("=".repeat(80));
  console.log("\nHypothesis: Structured topologies (FAT, Whipper, etc.) show stabilization");
  console.log("            after optimization, but arbitrary topologies do not.");
  console.log("\n" + "=".repeat(80));

  const results = {
    structured: [],
    semiStructured: [],
    arbitrary: [],
  };

  // Test 1: Structured topologies (based on known designs)
  console.log("\n[1/3] STRUCTURED TOPOLOGIES (based on FAT, Whipper, Hinged)");
  console.log("─".repeat(80));
  const structuredTrebuchets = generateRandomTrebuchets(8, 12345);
  for (const { id, config } of structuredTrebuchets) {
    results.structured.push(processTopology(id, config, "structured"));
  }

  // Test 2: Semi-structured topologies (have basic arm/weight but random details)
  console.log("\n\n[2/3] SEMI-STRUCTURED TOPOLOGIES (basic structure, random details)");
  console.log("─".repeat(80));
  const semiStructuredTrebuchets = generateSemiStructuredTrebuchets(8, 99999);
  for (const { id, config } of semiStructuredTrebuchets) {
    results.semiStructured.push(processTopology(id, config, "semi-structured"));
  }

  // Test 3: Arbitrary topologies (completely random constraint graphs)
  console.log("\n\n[3/3] ARBITRARY TOPOLOGIES (random constraint graphs)");
  console.log("─".repeat(80));
  const arbitraryTrebuchets = generateArbitraryTrebuchets(8, 54321, {
    minParticles: 5,
    maxParticles: 8,
    rodProbability: 0.4,
    sliderProbability: 0.25,
    pinProbability: 0.15,
  });
  for (const { id, config } of arbitraryTrebuchets) {
    results.arbitrary.push(processTopology(id, config, "arbitrary"));
  }

  // Analysis
  console.log("\n\n" + "=".repeat(80));
  console.log("COMPARATIVE ANALYSIS");
  console.log("=".repeat(80));

  function analyzeGroup(groupName, groupResults) {
    const successful = groupResults.filter((r) => !r.error);

    if (successful.length === 0) {
      console.log(`\n${groupName.toUpperCase()}: No successful optimizations`);
      return null;
    }

    const avgSensitivityChange =
      successful.reduce((sum, r) => sum + r.growthRateChange, 0) /
      successful.length;

    const stabilized = successful.filter((r) => r.growthRateChange < -5).length;
    const destabilized = successful.filter((r) => r.growthRateChange > 5).length;
    const unchanged = successful.filter((r) => Math.abs(r.growthRateChange) <= 5)
      .length;

    const avgRangeImprovement =
      successful.reduce((sum, r) => sum + r.rangeImprovement, 0) /
      successful.length;

    const avgInitialGR =
      successful.reduce((sum, r) => sum + r.initialGrowthRate, 0) /
      successful.length;
    const avgFinalGR =
      successful.reduce((sum, r) => sum + r.finalGrowthRate, 0) /
      successful.length;

    console.log(`\n${groupName.toUpperCase()}:`);
    console.log(`  Success Rate: ${successful.length}/${groupResults.length}`);
    console.log(
      `  Avg Sensitivity Change: ${avgSensitivityChange > 0 ? "+" : ""}${avgSensitivityChange.toFixed(1)}%`
    );
    console.log(`  Stabilized (>5% decrease): ${stabilized}`);
    console.log(`  Destabilized (>5% increase): ${destabilized}`);
    console.log(`  Unchanged (±5%): ${unchanged}`);
    console.log(`  Avg Range Improvement: +${avgRangeImprovement.toFixed(1)}%`);
    console.log(`  Avg Initial Growth Rate: ${avgInitialGR.toFixed(4)}`);
    console.log(`  Avg Final Growth Rate: ${avgFinalGR.toFixed(4)}`);

    return {
      groupName,
      successRate: successful.length / groupResults.length,
      avgSensitivityChange,
      stabilized,
      destabilized,
      unchanged,
      avgRangeImprovement,
      avgInitialGR,
      avgFinalGR,
      successful,
    };
  }

  const structuredAnalysis = analyzeGroup("Structured", results.structured);
  const semiStructuredAnalysis = analyzeGroup(
    "Semi-Structured",
    results.semiStructured
  );
  const arbitraryAnalysis = analyzeGroup("Arbitrary", results.arbitrary);

  // Hypothesis test
  console.log("\n\n" + "=".repeat(80));
  console.log("HYPOTHESIS TEST RESULTS");
  console.log("=".repeat(80));

  if (!structuredAnalysis || !semiStructuredAnalysis || !arbitraryAnalysis) {
    console.log("\n❌ Insufficient data for hypothesis test");
    return;
  }

  console.log("\nSensitivity Change Comparison:");
  console.log(`  Structured:       ${structuredAnalysis.avgSensitivityChange.toFixed(1)}%`);
  console.log(`  Semi-Structured:  ${semiStructuredAnalysis.avgSensitivityChange.toFixed(1)}%`);
  console.log(`  Arbitrary:        ${arbitraryAnalysis.avgSensitivityChange.toFixed(1)}%`);

  const structuredStabilizes = structuredAnalysis.avgSensitivityChange < -10;
  const arbitraryStabilizes = arbitraryAnalysis.avgSensitivityChange < -10;

  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSION:");
  console.log("=".repeat(80));

  if (structuredStabilizes && !arbitraryStabilizes) {
    console.log("\n✓ HYPOTHESIS CONFIRMED");
    console.log("  Structured topologies show stabilization after optimization,");
    console.log("  while arbitrary topologies do NOT.");
    console.log(
      "\n  This suggests that the stabilization effect is specific to"
    );
    console.log("  known-good mechanical patterns (FAT, Whipper, Hinged, etc.).");
    console.log(
      "\n  Implication: The topology matters fundamentally - not all designs"
    );
    console.log("  can be rescued by optimization.");
  } else if (structuredStabilizes && arbitraryStabilizes) {
    console.log("\n✗ HYPOTHESIS REJECTED");
    console.log("  BOTH structured and arbitrary topologies stabilize!");
    console.log(
      "\n  This suggests optimization is a universal stabilizing force,"
    );
    console.log("  regardless of underlying topology type.");
  } else if (!structuredStabilizes && arbitraryStabilizes) {
    console.log("\n✗ HYPOTHESIS REJECTED (opposite direction)");
    console.log("  Arbitrary topologies stabilize MORE than structured ones!");
    console.log("\n  This is the opposite of the hypothesis.");
  } else {
    console.log("\n? INCONCLUSIVE");
    console.log("  Neither topology type shows clear stabilization.");
    console.log("  More data or different parameter ranges may be needed.");
  }

  // Additional insights
  console.log("\n\nAdditional Insights:");

  if (structuredAnalysis.avgInitialGR > arbitraryAnalysis.avgInitialGR * 1.5) {
    console.log(
      "  - Structured designs start more chaotic on average"
    );
  } else if (arbitraryAnalysis.avgInitialGR > structuredAnalysis.avgInitialGR * 1.5) {
    console.log(
      "  - Arbitrary designs start more chaotic on average"
    );
  }

  if (structuredAnalysis.successRate > arbitraryAnalysis.successRate * 1.2) {
    console.log(
      "  - Structured designs have higher optimization success rate"
    );
  } else if (arbitraryAnalysis.successRate > structuredAnalysis.successRate * 1.2) {
    console.log(
      "  - Arbitrary designs have higher optimization success rate"
    );
  }

  console.log("\n" + "=".repeat(80));

  // Store results
  globalThis.hypothesisTestResults = {
    structured: structuredAnalysis,
    semiStructured: semiStructuredAnalysis,
    arbitrary: arbitraryAnalysis,
    rawResults: results,
  };

  // Basic validation
  expect(results.structured.length).toBeGreaterThan(0);
  expect(results.arbitrary.length).toBeGreaterThan(0);
});
