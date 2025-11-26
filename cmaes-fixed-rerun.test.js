import { expect, test } from "vitest";
import { searchWithCMAES } from "./cmaes-search.js";
import { presets, calculateRange, fillEmptyConstraints } from "./trebuchetsimulation.js";
import { simulate } from "./simulate.js";
import * as fs from "fs";

test("CMA-ES with proper bounds enforcement", { timeout: 900000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("CMA-ES FIXED: Bounds Enforcement Applied");
  console.log("=".repeat(80));
  console.log("Previous exploit: Negative mass (-5.62 kg projectile)");
  console.log("Fix: Clip all variables to valid bounds");
  console.log("=".repeat(80));

  const start = Date.now();
  const result = searchWithCMAES({
    numParticles: 8,
    maxEvaluations: 50000,
    maxForce: 15000,
    minMass: 1,
    seed: 66666,
    verbose: true,
  });
  const elapsed = (Date.now() - start) / 1000;

  // Get preset baselines
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
      // Skip
    }
  }

  presetRanges.sort((a, b) => b.range - a.range);

  console.log("\nTop 3 Human Designs:");
  for (let i = 0; i < Math.min(3, presetRanges.length); i++) {
    console.log(`  ${i + 1}. ${presetRanges[i].name}: ${presetRanges[i].range.toFixed(2)} ft`);
  }

  const bestPreset = presetRanges[0];

  console.log("\n" + "=".repeat(80));
  console.log("RESULTS");
  console.log("=".repeat(80));

  if (!result.bestEver || result.bestEver.fitness === 0) {
    console.log("\n❌ NO VALID SOLUTIONS FOUND");
    console.log("All designs violated constraints");
  } else {
    console.log(`\nCMA-ES Champion:`);
    console.log(`  Range: ${result.bestEver.range.toFixed(2)} ft`);
    console.log(`  Force: ${result.bestEver.peakLoad.toFixed(2)} lbf`);
    console.log(`  Energy conserved: ${result.bestEver.energyConserved ? "✓" : "✗"}`);
    console.log(`  Particles: ${result.bestEver.numParticles}`);
    console.log(`  Constraints: ${result.bestEver.numConstraints}`);
    console.log(`  Found in gen: ${result.bestEver.generation}`);

    // Validate no negative masses
    let hasNegativeMass = false;
    for (const particle of result.bestEver.config.particles) {
      if (particle.mass < 0) {
        hasNegativeMass = true;
        console.log(`  ❌ WARNING: Negative mass found: ${particle.mass.toFixed(2)} kg`);
      }
    }

    if (!hasNegativeMass) {
      console.log(`  ✓ All masses positive`);
    }

    const vsHuman = ((result.bestEver.range / bestPreset.range - 1) * 100);
    console.log(`\nvs Best Human: ${vsHuman > 0 ? '+' : ''}${vsHuman.toFixed(1)}%`);

    if (vsHuman > 0) {
      console.log(`🎉 CMA-ES BEATS HUMAN DESIGNS!`);
    } else {
      console.log(`○ Human designs still superior`);
    }

    // Sanity check
    if (result.bestEver.range > 10000) {
      console.log(`\n⚠️  WARNING: Range > 10,000 ft may indicate another exploit`);
    } else {
      console.log(`\n✓ Range within physically plausible bounds`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("PERFORMANCE");
  console.log("=".repeat(80));
  console.log(`Time: ${elapsed.toFixed(2)}s`);
  console.log(`Evaluations: ${result.totalEvaluations.toLocaleString()}`);
  console.log(`Speed: ${(result.totalEvaluations / elapsed).toFixed(1)} evals/s`);

  // Save results
  const outputData = {
    champion: result.bestEver,
    presets: presetRanges.slice(0, 5),
    performance: {
      time: elapsed,
      evaluations: result.totalEvaluations,
      speed: result.totalEvaluations / elapsed,
    },
    history: result.history,
  };

  fs.writeFileSync(
    "/home/user/jstreb/cmaes-fixed-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("\n✓ Results saved to cmaes-fixed-results.json");
  console.log("=".repeat(80) + "\n");

  expect(result.bestEver).toBeDefined();
});
