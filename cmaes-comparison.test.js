import { expect, test } from "vitest";
import { searchWithCMAES } from "./cmaes-search.js";
import { searchConstrainedTopologies } from "./constrained-topology-search.js";
import { presets, calculateRange, fillEmptyConstraints } from "./trebuchetsimulation.js";
import { simulate } from "./simulate.js";
import * as fs from "fs";

test("CMA-ES vs GA comparison", { timeout: 1800000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("OPTIMIZER COMPARISON: CMA-ES vs GENETIC ALGORITHM");
  console.log("=".repeat(80));
  console.log("Testing hypothesis: Fixed encoding + CMA-ES > Variable encoding + GA");
  console.log("=".repeat(80));

  // Run CMA-ES search
  console.log("\n" + "=".repeat(80));
  console.log("EXPERIMENT 1: CMA-ES with Fixed Encoding");
  console.log("=".repeat(80));

  const cmaesStart = Date.now();
  const cmaesResult = searchWithCMAES({
    numParticles: 8,
    maxEvaluations: 50000, // Smaller budget for faster comparison
    maxForce: 15000,
    minMass: 1,
    seed: 55555,
    verbose: true,
  });
  const cmaesTime = (Date.now() - cmaesStart) / 1000;

  // Run GA search for comparison
  console.log("\n" + "=".repeat(80));
  console.log("EXPERIMENT 2: GA with Variable Encoding");
  console.log("=".repeat(80));

  const gaStart = Date.now();
  const gaResult = searchConstrainedTopologies({
    populationSize: 20, // Match CMA-ES lambda
    generations: 2500,  // 20 * 2500 = 50,000 evaluations
    eliteCount: 5,
    mutationRate: 0.3,
    seed: 55555,
    maxForce: 15000,
    minMass: 1,
    verbose: true,
  });
  const gaTime = (Date.now() - gaStart) / 1000;

  // Get preset baselines
  console.log("\n" + "=".repeat(80));
  console.log("BASELINE: Human-Designed Presets");
  console.log("=".repeat(80));

  const presetRanges = [];
  for (const [name, json] of Object.entries(presets)) {
    try {
      const data = JSON.parse(json);
      fillEmptyConstraints(data);

      function terminate(trajectories) {
        if (trajectories.length === 0) return false;
        var trajectory = trajectories[trajectories.length - 1];
        var projectileY = -trajectory[2 * data.projectile + 1];
        var projectileVY = -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
        return projectileY < 0 || projectileVY < 0;
      }

      const [trajectories] = simulate(
        data.particles,
        data.constraints,
        data.timestep,
        data.duration,
        terminate
      );

      if (trajectories.length > 0) {
        const range = calculateRange(trajectories, data);
        presetRanges.push({ name, range });
      }
    } catch (error) {
      // Skip
    }
  }

  presetRanges.sort((a, b) => b.range - a.range);

  console.log("\nTop 3 Human Designs:");
  for (let i = 0; i < Math.min(3, presetRanges.length); i++) {
    console.log(`  ${i + 1}. ${presetRanges[i].name}: ${presetRanges[i].range.toFixed(2)} ft`);
  }

  // Comparison
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS COMPARISON");
  console.log("=".repeat(80));

  const bestPreset = presetRanges[0];

  console.log("\n1. PERFORMANCE");
  console.log("-".repeat(80));
  console.log(`CMA-ES Best:     ${cmaesResult.bestEver?.range?.toFixed(2) || 0} ft`);
  console.log(`GA Best:         ${gaResult.bestEver?.range?.toFixed(2) || 0} ft`);
  console.log(`Best Preset:     ${bestPreset.range.toFixed(2)} ft`);

  const cmaesVsGA = ((cmaesResult.bestEver?.range || 0) / (gaResult.bestEver?.range || 1) - 1) * 100;
  const cmaesVsHuman = ((cmaesResult.bestEver?.range || 0) / bestPreset.range - 1) * 100;
  const gaVsHuman = ((gaResult.bestEver?.range || 0) / bestPreset.range - 1) * 100;

  console.log(`\nCMA-ES vs GA:    ${cmaesVsGA > 0 ? '+' : ''}${cmaesVsGA.toFixed(1)}%`);
  console.log(`CMA-ES vs Human: ${cmaesVsHuman > 0 ? '+' : ''}${cmaesVsHuman.toFixed(1)}%`);
  console.log(`GA vs Human:     ${gaVsHuman > 0 ? '+' : ''}${gaVsHuman.toFixed(1)}%`);

  console.log("\n2. CONVERGENCE SPEED");
  console.log("-".repeat(80));

  // Find when each reached 90% of final performance
  const cmaesTarget = (cmaesResult.bestEver?.fitness || 0) * 0.9;
  const gaTarget = (gaResult.bestEver?.fitness || 0) * 0.9;

  let cmaes90Eval = cmaesResult.totalEvaluations;
  for (const h of cmaesResult.history) {
    if (h.maxFitness >= cmaesTarget) {
      cmaes90Eval = h.evaluation;
      break;
    }
  }

  let ga90Eval = gaResult.history.length * 20; // pop size
  for (let i = 0; i < gaResult.history.length; i++) {
    if (gaResult.history[i].maxFitness >= gaTarget) {
      ga90Eval = i * 20;
      break;
    }
  }

  console.log(`CMA-ES 90% at:   ${cmaes90Eval.toLocaleString()} evaluations`);
  console.log(`GA 90% at:       ${ga90Eval.toLocaleString()} evaluations`);
  console.log(`Speedup:         ${(ga90Eval / cmaes90Eval).toFixed(2)}x`);

  console.log("\n3. EFFICIENCY");
  console.log("-".repeat(80));
  console.log(`CMA-ES Time:     ${cmaesTime.toFixed(2)}s`);
  console.log(`GA Time:         ${gaTime.toFixed(2)}s`);
  console.log(`CMA-ES Speed:    ${(cmaesResult.totalEvaluations / cmaesTime).toFixed(1)} evals/s`);
  console.log(`GA Speed:        ${(50000 / gaTime).toFixed(1)} evals/s`);

  console.log("\n4. FINAL DESIGNS");
  console.log("-".repeat(80));

  if (cmaesResult.bestEver) {
    console.log(`\nCMA-ES Champion:`);
    console.log(`  Range: ${cmaesResult.bestEver.range.toFixed(2)} ft`);
    console.log(`  Force: ${cmaesResult.bestEver.peakLoad.toFixed(2)} lbf`);
    console.log(`  Particles: ${cmaesResult.bestEver.numParticles}`);
    console.log(`  Constraints: ${cmaesResult.bestEver.numConstraints}`);
    console.log(`  Valid: ${cmaesResult.bestEver.valid ? "✓" : "✗"}`);
  }

  if (gaResult.bestEver) {
    console.log(`\nGA Champion:`);
    console.log(`  Range: ${gaResult.bestEver.range.toFixed(2)} ft`);
    console.log(`  Force: ${gaResult.bestEver.peakLoad.toFixed(2)} lbf`);
    console.log(`  Particles: ${gaResult.bestEver.numParticles}`);
    console.log(`  Constraints: ${gaResult.bestEver.numConstraints}`);
    console.log(`  Valid: ${gaResult.bestEver.valid ? "✓" : "✗"}`);
  }

  console.log("\n5. CONVERGENCE ANALYSIS");
  console.log("-".repeat(80));

  // Check final sigma for CMA-ES (measure of convergence)
  const finalSigma = cmaesResult.history[cmaesResult.history.length - 1]?.sigma || 0;
  console.log(`\nCMA-ES final sigma: ${finalSigma.toFixed(6)}`);
  console.log(`CMA-ES converged: ${finalSigma < 0.01 ? "✓" : "✗ (still exploring)"}`);

  // Check GA diversity
  const gaFinalGen = gaResult.history[gaResult.history.length - 1];
  const gaFinalAvg = gaFinalGen.avgFitness;
  const gaFinalMax = gaFinalGen.maxFitness;
  const gaDiversity = (gaFinalMax - gaFinalAvg) / gaFinalMax;
  console.log(`\nGA final diversity: ${(gaDiversity * 100).toFixed(1)}%`);
  console.log(`GA converged: ${gaDiversity < 0.2 ? "✓" : "✗ (still diverse)"}`);

  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSION");
  console.log("=".repeat(80));

  if (cmaesVsGA > 10) {
    console.log("\n✓ CMA-ES SIGNIFICANTLY OUTPERFORMS GA");
    console.log(`  ${cmaesVsGA.toFixed(1)}% better performance`);
    console.log(`  ${(ga90Eval / cmaes90Eval).toFixed(1)}x faster convergence`);
  } else if (cmaesVsGA > 0) {
    console.log("\n✓ CMA-ES SLIGHTLY OUTPERFORMS GA");
    console.log(`  ${cmaesVsGA.toFixed(1)}% better performance`);
  } else if (cmaesVsGA > -10) {
    console.log("\n≈ CMA-ES AND GA PERFORM SIMILARLY");
    console.log(`  ${Math.abs(cmaesVsGA).toFixed(1)}% difference`);
  } else {
    console.log("\n✗ GA OUTPERFORMS CMA-ES");
    console.log(`  ${Math.abs(cmaesVsGA).toFixed(1)}% worse performance`);
    console.log(`  Fixed encoding may be limiting search`);
  }

  if (cmaesVsHuman > 0 || gaVsHuman > 0) {
    console.log("\n🎉 BREAKTHROUGH: Computational design beats human designs!");
  } else {
    console.log("\n○ Human designs still superior, but gap is narrowing");
    console.log(`  Need ${(bestPreset.range / (cmaesResult.bestEver?.range || 1)).toFixed(1)}x more performance`);
  }

  console.log("\n" + "=".repeat(80));

  // Save results
  const outputData = {
    cmaes: {
      best: cmaesResult.bestEver,
      history: cmaesResult.history,
      totalEvaluations: cmaesResult.totalEvaluations,
      time: cmaesTime,
    },
    ga: {
      best: gaResult.bestEver,
      history: gaResult.history,
      totalEvaluations: 50000,
      time: gaTime,
    },
    comparison: {
      cmaesVsGA: cmaesVsGA,
      cmaesVsHuman: cmaesVsHuman,
      gaVsHuman: gaVsHuman,
      cmaes90Eval,
      ga90Eval,
      convergenceSpeedup: ga90Eval / cmaes90Eval,
    },
    presets: presetRanges.slice(0, 5),
  };

  fs.writeFileSync(
    "/home/user/jstreb/cmaes-comparison-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("✓ Results saved to cmaes-comparison-results.json\n");

  // Basic validation
  expect(cmaesResult.bestEver).toBeDefined();
  expect(gaResult.bestEver).toBeDefined();
});
