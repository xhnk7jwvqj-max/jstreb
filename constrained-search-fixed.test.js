import { expect, test } from "vitest";
import { searchConstrainedTopologies } from "./constrained-topology-search.js";
import { presets, calculateRange, fillEmptyConstraints } from "./trebuchetsimulation.js";
import { simulate } from "./simulate.js";
import * as fs from "fs";

test("constrained topology search with mainaxle fix", { timeout: 900000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("CONSTRAINED TOPOLOGY SEARCH - WITH MAINAXLE FIX");
  console.log("=".repeat(80));
  console.log("Searching for topologies that satisfy:");
  console.log("  • Peak force ≤ 15,000 lbf");
  console.log("  • Energy conservation (5% tolerance)");
  console.log("  • Minimum particle mass = 1 kg");
  console.log("  • Mainaxle = highest particle with pin/slider (NEW FIX)");
  console.log("\nTarget: Find genuinely buildable champion without exploits");
  console.log("=".repeat(80));

  const startTime = Date.now();

  const searchResult = searchConstrainedTopologies({
    populationSize: 100,
    generations: 1000,
    eliteCount: 10,
    mutationRate: 0.3,
    seed: 77777, // Different seed from previous run
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
    console.log("All topologies violated constraints");

    const lastGen = history[history.length - 1];
    console.log(`\nFinal generation statistics:`);
    console.log(`  Valid designs: ${lastGen.validCount}/100`);
    console.log(`  Rejection reasons:`, lastGen.rejectionReasons);

    fs.writeFileSync(
      "/home/user/jstreb/constrained-search-fixed-failed.json",
      JSON.stringify({ history, lastGen }, null, 2)
    );

    return;
  }

  console.log("\n" + "=".repeat(80));
  console.log("CONSTRAINED CHAMPION DISCOVERED (WITH FIX)");
  console.log("=".repeat(80));
  console.log(`Range: ${bestEver.range.toFixed(2)} ft`);
  console.log(`Peak Load: ${bestEver.peakLoad.toFixed(2)} lbf (limit: 15,000)`);
  console.log(`Energy conserved: ${bestEver.energyConserved ? "✓" : "✗"}`);
  console.log(`Found in generation: ${bestEver.generation}`);
  console.log(`Particles: ${bestEver.numParticles}`);
  console.log(`Constraints: ${bestEver.numConstraints}`);
  console.log("=".repeat(80));

  // Verify mainaxle assignment
  const config = bestEver.config;
  const particlesWithConstraints = new Set();

  if (config.constraints.pin) {
    for (const pin of config.constraints.pin) {
      particlesWithConstraints.add(pin.p);
    }
  }

  if (config.constraints.slider) {
    for (const slider of config.constraints.slider) {
      particlesWithConstraints.add(slider.p);
    }
  }

  let highestY = -Infinity;
  let highestParticle = -1;

  for (const particleIdx of particlesWithConstraints) {
    if (particleIdx < config.particles.length) {
      const y = config.particles[particleIdx].y;
      if (y > highestY) {
        highestY = y;
        highestParticle = particleIdx;
      }
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("MAINAXLE VERIFICATION");
  console.log("=".repeat(80));
  console.log(`Mainaxle particle: ${config.mainaxle}`);
  console.log(`Mainaxle Y position: ${config.particles[config.mainaxle].y.toFixed(2)}`);
  console.log(`Expected highest: ${highestParticle} at Y=${highestY.toFixed(2)}`);
  console.log(`Particles with constraints: ${Array.from(particlesWithConstraints).join(", ")}`);

  if (highestParticle !== -1) {
    if (config.mainaxle === highestParticle) {
      console.log(`✓ Mainaxle correctly set to highest constrained particle`);
    } else {
      console.log(`❌ WARNING: Mainaxle not set to highest particle!`);
    }
  }

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

  console.log(`\nConstrained Champion (Fixed): ${bestEver.range.toFixed(2)} ft`);
  if (improvement > 0) {
    console.log(`Improvement over best preset: +${improvement.toFixed(1)}%`);
    console.log(`✓ CONSTRAINED CHAMPION BEATS HUMAN DESIGNS`);
  } else {
    console.log(`Performance vs best preset: ${improvement.toFixed(1)}%`);
    console.log(`○ Within range of human designs`);
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

  // Check for suspicious jumps (possible new exploits)
  console.log("\n" + "=".repeat(80));
  console.log("EXPLOIT DETECTION");
  console.log("=".repeat(80));

  let suspiciousJumps = [];
  for (let i = 1; i < history.length; i++) {
    const improvement = history[i].maxFitness - history[i - 1].maxFitness;
    const percentIncrease = history[i - 1].maxFitness > 0
      ? (improvement / history[i - 1].maxFitness) * 100
      : 0;

    if (percentIncrease > 50 && improvement > 100) {
      suspiciousJumps.push({
        generation: i,
        from: history[i - 1].maxFitness,
        to: history[i].maxFitness,
        increase: improvement,
        percent: percentIncrease,
      });
    }
  }

  if (suspiciousJumps.length > 0) {
    console.log("\n⚠️  WARNING: Suspicious fitness jumps detected:");
    for (const jump of suspiciousJumps.slice(0, 5)) {
      console.log(`  Gen ${jump.generation}: ${jump.from.toFixed(2)} → ${jump.to.toFixed(2)} (+${jump.percent.toFixed(1)}%)`);
    }
    console.log("\nThese may indicate new exploits being discovered.");
  } else {
    console.log("\n✓ No suspicious fitness jumps detected");
    console.log("  Evolution appears gradual and genuine");
  }

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

  // Sanity check on range
  if (bestEver.range > 50000) {
    console.log("\n⚠️  WARNING: Range exceeds 50,000 ft (9.5 miles)");
    console.log("  This is physically implausible for a trebuchet");
    console.log("  May indicate another exploit or calculation error");
  } else if (bestEver.range > 10000) {
    console.log("\n⚠️  Range exceeds 10,000 ft (1.9 miles) - very high");
    console.log("  World record is ~1,300 ft");
    console.log("  Design should be carefully validated");
  } else {
    console.log("\n✓ Range within physically plausible bounds");
  }

  // Save results
  const outputData = {
    constrainedChampionFixed: {
      range: bestEver.range,
      peakLoad: bestEver.peakLoad,
      energyConserved: bestEver.energyConserved,
      numParticles: bestEver.numParticles,
      numConstraints: bestEver.numConstraints,
      generation: bestEver.generation,
      config: bestEver.config,
      mainaxleVerified: config.mainaxle === highestParticle,
    },
    searchParameters: {
      populationSize: 100,
      generations: 1000,
      maxForce: 15000,
      minMass: 1,
      totalEvaluations,
      elapsedSeconds,
      simsPerSecond,
      seed: 77777,
      mainaxleFix: "highest particle with pin/slider",
    },
    comparison: {
      bestPreset: bestPreset.name,
      bestPresetRange: bestPreset.range,
      improvement: improvement,
    },
    history: history,
    constraintViolations: allReasons,
    suspiciousJumps: suspiciousJumps,
  };

  fs.writeFileSync(
    "/home/user/jstreb/constrained-search-fixed-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("\n✓ Results saved to constrained-search-fixed-results.json");
  console.log("=".repeat(80));

  // Validation
  expect(bestEver).toBeDefined();
  expect(bestEver.valid).toBe(true);
  expect(bestEver.peakLoad).toBeLessThanOrEqual(15000);
  expect(bestEver.energyConserved).toBe(true);
});
