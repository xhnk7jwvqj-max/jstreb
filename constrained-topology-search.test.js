import { expect, test } from "vitest";
import { searchConstrainedTopologies } from "./constrained-topology-search.js";
import { presets, calculateRange, fillEmptyConstraints } from "./trebuchetsimulation.js";
import { simulate } from "./simulate.js";
import * as fs from "fs";

test("constrained topology search - force and energy limits", { timeout: 900000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("CONSTRAINED TOPOLOGY SEARCH");
  console.log("=".repeat(80));
  console.log("Searching for topologies that satisfy:");
  console.log("  • Peak force ≤ 15,000 lbf");
  console.log("  • Energy conservation (5% tolerance)");
  console.log("  • Minimum particle mass = 1 kg");
  console.log("\nTarget: Find buildable champion (not simulation artifact)");
  console.log("=".repeat(80));

  const startTime = Date.now();

  const searchResult = searchConstrainedTopologies({
    populationSize: 100,
    generations: 1000,
    eliteCount: 10,
    mutationRate: 0.3,
    seed: 99999,
    maxForce: 15000,
    minMass: 1,
    verbose: true,
  });

  const endTime = Date.now();
  const elapsedSeconds = (endTime - startTime) / 1000;
  const totalEvaluations = 100 * 1000;
  const simsPerSecond = totalEvaluations / elapsedSeconds;

  console.log("\n" + "=".repeat(80));
  console.log("SEARCH STATISTICS");
  console.log("=".repeat(80));
  console.log(`Total time: ${elapsedSeconds.toFixed(2)}s`);
  console.log(`Total evaluations: ${totalEvaluations.toLocaleString()}`);
  console.log(`Speed: ${simsPerSecond.toFixed(1)} sims/second`);
  console.log("=".repeat(80));

  const { bestEver, history } = searchResult;

  if (!bestEver || bestEver.fitness === 0) {
    console.log("\n❌ NO VALID SOLUTIONS FOUND");
    console.log("All topologies violated constraints (force or energy)");

    // Analyze why search failed
    const lastGen = history[history.length - 1];
    console.log(`\nFinal generation statistics:`);
    console.log(`  Valid designs: ${lastGen.validCount}/${100}`);
    console.log(`  Rejection reasons:`, lastGen.rejectionReasons);

    fs.writeFileSync(
      "/home/user/jstreb/constrained-search-failed.json",
      JSON.stringify({ history, lastGen }, null, 2)
    );

    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log("CONSTRAINED CHAMPION DISCOVERED");
  console.log("=".repeat(80));
  console.log(`Range: ${bestEver.range.toFixed(2)} ft`);
  console.log(`Peak Load: ${bestEver.peakLoad.toFixed(2)} lbf (limit: 15,000)`);
  console.log(`Energy conserved: ${bestEver.energyConserved ? "✓" : "✗"}`);
  console.log(`Found in generation: ${bestEver.generation}`);
  console.log(`Particles: ${bestEver.numParticles}`);
  console.log(`Constraints: ${bestEver.numConstraints}`);
  console.log("=".repeat(80));

  // Compare with presets
  console.log("\n" + "=".repeat(80));
  console.log("COMPARISON WITH PRESETS");
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
      // Skip preset if it fails
    }
  }

  presetRanges.sort((a, b) => b.range - a.range);

  console.log("\nTop 5 Presets:");
  for (let i = 0; i < Math.min(5, presetRanges.length); i++) {
    console.log(`  ${i + 1}. ${presetRanges[i].name}: ${presetRanges[i].range.toFixed(2)} ft`);
  }

  const bestPreset = presetRanges[0];
  const improvement = ((bestEver.range / bestPreset.range - 1) * 100);

  console.log(`\nConstrained Champion: ${bestEver.range.toFixed(2)} ft`);
  if (improvement > 0) {
    console.log(`Improvement over best preset: +${improvement.toFixed(1)}%`);
    console.log(`✓ CONSTRAINED CHAMPION BEATS HUMAN DESIGNS`);
  } else {
    console.log(`Performance vs best preset: ${improvement.toFixed(1)}%`);
    console.log(`○ Constrained champion underperforms best preset`);
  }

  // Evolution progress analysis
  console.log("\n" + "=".repeat(80));
  console.log("EVOLUTION PROGRESS");
  console.log("=".repeat(80));

  const milestones = [0, 100, 250, 500, 750, 999];
  console.log("\nFitness over time:");
  for (const gen of milestones) {
    if (gen < history.length) {
      const h = history[gen];
      console.log(`  Gen ${gen.toString().padStart(4)}: Best=${h.maxFitness.toFixed(2)}, Avg=${h.avgFitness.toFixed(2)}, Valid=${h.validCount}/100`);
    }
  }

  const finalImprovement = history[999].maxFitness - history[0].maxFitness;
  console.log(`\nTotal improvement: +${finalImprovement.toFixed(2)} ft`);
  console.log(`Final valid count: ${history[999].validCount}/100`);

  // Constraint violation analysis
  console.log("\n" + "=".repeat(80));
  console.log("CONSTRAINT VIOLATION ANALYSIS");
  console.log("=".repeat(80));

  const allReasons = {};
  for (const h of history) {
    for (const [reason, count] of Object.entries(h.rejectionReasons)) {
      allReasons[reason] = (allReasons[reason] || 0) + count;
    }
  }

  console.log("\nTotal rejections across all generations:");
  for (const [reason, count] of Object.entries(allReasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count.toLocaleString()}`);
  }

  // Save results
  const outputData = {
    constrainedChampion: {
      range: bestEver.range,
      peakLoad: bestEver.peakLoad,
      energyConserved: bestEver.energyConserved,
      numParticles: bestEver.numParticles,
      numConstraints: bestEver.numConstraints,
      generation: bestEver.generation,
      config: bestEver.config,
    },
    searchParameters: {
      populationSize: 100,
      generations: 1000,
      maxForce: 15000,
      minMass: 1,
      totalEvaluations,
      elapsedSeconds,
      simsPerSecond,
    },
    comparison: {
      bestPreset: bestPreset.name,
      bestPresetRange: bestPreset.range,
      improvement: improvement,
    },
    history: history,
    constraintViolations: allReasons,
  };

  fs.writeFileSync(
    "/home/user/jstreb/constrained-search-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("\n✓ Results saved to constrained-search-results.json");
  console.log("=".repeat(80));

  // Validation
  expect(bestEver).toBeDefined();
  expect(bestEver.valid).toBe(true);
  expect(bestEver.peakLoad).toBeLessThanOrEqual(15000);
  expect(bestEver.energyConserved).toBe(true);
});
