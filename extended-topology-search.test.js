import { expect, test } from "vitest";
import { searchTopologies, evaluateTopology } from "./topology-search.js";
import { presets } from "./trebuchetsimulation.js";
import * as fs from "fs";

test("extended topology search - 10 minute run", { timeout: 900000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("EXTENDED TOPOLOGY SEARCH - 10 MINUTE RUN");
  console.log("=".repeat(80));
  console.log("\nGoal: Give evolution more time to discover better topologies");
  console.log("Parameters:");
  console.log("  - Population: 100 (2.5x larger)");
  console.log("  - Generations: 1000 (25x more)");
  console.log("  - Total evaluations: ~100,000 (62.5x more)");
  console.log("  - Expected runtime: ~10 minutes");
  console.log("=".repeat(80));

  const startTime = Date.now();

  // Run extended topology search
  const searchResult = searchTopologies({
    populationSize: 100,
    generations: 1000,
    eliteCount: 10, // Keep more elite
    mutationRate: 0.3,
    seed: 88888, // Different seed from quick run
    verbose: true,
  });

  const endTime = Date.now();
  const runtimeSeconds = ((endTime - startTime) / 1000).toFixed(1);
  const runtimeMinutes = (runtimeSeconds / 60).toFixed(2);

  console.log("\n" + "=".repeat(80));
  console.log("RUNTIME STATISTICS");
  console.log("=".repeat(80));
  console.log(`Total runtime: ${runtimeSeconds}s (${runtimeMinutes} minutes)`);
  console.log(`Evaluations: ${searchResult.history.length * 100}`);
  console.log(
    `Evaluations/second: ${((searchResult.history.length * 100) / runtimeSeconds).toFixed(1)}`
  );

  console.log("\n" + "=".repeat(80));
  console.log("DISCOVERED TOPOLOGY DETAILS");
  console.log("=".repeat(80));
  console.log("\nBest discovered configuration:");
  console.log(JSON.stringify(searchResult.bestEver.config, null, 2));

  // Save to file for later analysis
  const outputData = {
    runtime: {
      seconds: runtimeSeconds,
      minutes: runtimeMinutes,
      evaluations: searchResult.history.length * 100,
      evaluationsPerSecond: (searchResult.history.length * 100) / runtimeSeconds,
    },
    bestTopology: searchResult.bestEver,
    evolutionHistory: searchResult.history,
    parameters: {
      populationSize: 100,
      generations: 1000,
      eliteCount: 10,
      mutationRate: 0.3,
      seed: 88888,
    },
  };

  fs.writeFileSync(
    "/home/user/jstreb/extended-search-results.json",
    JSON.stringify(outputData, null, 2)
  );

  console.log("\n✓ Results saved to extended-search-results.json");

  // Compare with known presets
  console.log("\n" + "=".repeat(80));
  console.log("COMPARISON WITH KNOWN DESIGNS");
  console.log("=".repeat(80));

  const presetResults = [];
  for (const [name, json] of Object.entries(presets)) {
    const config = JSON.parse(json);
    const result = evaluateTopology(config);
    if (result.valid) {
      presetResults.push({ name, ...result });
    }
  }

  presetResults.sort((a, b) => b.fitness - a.fitness);

  console.log("\nKnown preset performances:");
  presetResults.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.name}: ${r.range.toFixed(2)}`);
  });

  const discoveredRank =
    presetResults.filter((r) => r.fitness > searchResult.bestEver.fitness)
      .length + 1;

  console.log(`\nDiscovered topology: ${searchResult.bestEver.range.toFixed(2)}`);
  console.log(`Rank: ${discoveredRank}/${presetResults.length + 1}`);

  if (discoveredRank === 1) {
    console.log("🏆 CHAMPION - BEATS ALL KNOWN DESIGNS!");
  } else if (discoveredRank <= 3) {
    console.log("🥉 PODIUM - Top 3 performance!");
  } else if (discoveredRank <= 5) {
    console.log("⭐ STRONG - Top 5 performance");
  } else if (discoveredRank <= presetResults.length / 2) {
    console.log("✓ ABOVE AVERAGE");
  } else {
    console.log("○ BELOW AVERAGE");
  }

  // Evolution progress analysis
  console.log("\n" + "=".repeat(80));
  console.log("EVOLUTION PROGRESS");
  console.log("=".repeat(80));

  const milestones = [0, 99, 199, 299, 499, 699, 999];
  console.log("\nFitness at key generations:");
  milestones.forEach((gen) => {
    if (gen < searchResult.history.length) {
      const h = searchResult.history[gen];
      console.log(
        `  Gen ${gen}: Max=${h.maxFitness.toFixed(2)}, Avg=${h.avgFitness.toFixed(2)}, Valid=${h.validCount}/100`
      );
    }
  });

  const initialBest = searchResult.history[0].maxFitness;
  const finalBest = searchResult.bestEver.fitness;
  const improvement = finalBest - initialBest;
  const improvementPercent =
    initialBest > 0 ? ((improvement / initialBest) * 100).toFixed(1) : "∞";

  console.log(
    `\nTotal improvement: ${initialBest.toFixed(2)} → ${finalBest.toFixed(2)} (+${improvementPercent}%)`
  );

  // Find when best was discovered
  const bestGeneration = searchResult.bestEver.generation;
  const progressToFindBest = ((bestGeneration / 1000) * 100).toFixed(1);

  console.log(`Best found at generation: ${bestGeneration} (${progressToFindBest}% through)`);

  // Check for convergence/stagnation
  const last100Gens = searchResult.history.slice(-100);
  const last100Best = Math.max(...last100Gens.map((h) => h.maxFitness));
  const beforeLast100Best = Math.max(
    ...searchResult.history.slice(0, -100).map((h) => h.maxFitness)
  );
  const last100Improvement = last100Best - beforeLast100Best;

  console.log(
    `\nImprovement in last 100 generations: ${last100Improvement.toFixed(2)}`
  );
  if (last100Improvement < 1) {
    console.log("  → Evolution has likely converged/stagnated");
  } else if (last100Improvement < finalBest * 0.05) {
    console.log("  → Evolution is slowing down");
  } else {
    console.log("  → Evolution still making good progress");
  }

  // Diversity analysis
  const finalGen = searchResult.history[searchResult.history.length - 1];
  console.log(`\nFinal population diversity:`);
  console.log(`  Valid topologies: ${finalGen.validCount}/100`);
  console.log(`  Best fitness: ${finalGen.maxFitness.toFixed(2)}`);
  console.log(`  Average fitness: ${finalGen.avgFitness.toFixed(2)}`);
  const diversityRatio = finalGen.avgFitness / finalGen.maxFitness;
  console.log(`  Diversity ratio: ${diversityRatio.toFixed(3)} (avg/max)`);

  if (diversityRatio > 0.8) {
    console.log("  → High diversity - population hasn't converged");
  } else if (diversityRatio > 0.5) {
    console.log("  → Moderate diversity");
  } else {
    console.log("  → Low diversity - population has converged");
  }

  // Topology characteristics
  console.log("\n" + "=".repeat(80));
  console.log("DISCOVERED TOPOLOGY CHARACTERISTICS");
  console.log("=".repeat(80));

  const best = searchResult.bestEver.config;
  console.log(`\nStructure:`);
  console.log(`  Particles: ${best.particles.length}`);
  console.log(`  Rods: ${best.constraints.rod?.length || 0}`);
  console.log(`  Sliders: ${best.constraints.slider?.length || 0}`);
  console.log(`  Pins: ${best.constraints.pin?.length || 0}`);

  const masses = best.particles.map((p) => p.mass);
  const totalMass = masses.reduce((a, b) => a + b, 0);
  const maxMass = Math.max(...masses);
  const minMass = Math.min(...masses);

  console.log(`\nMass distribution:`);
  console.log(`  Total: ${totalMass.toFixed(1)} kg`);
  console.log(`  Range: ${minMass.toFixed(1)} - ${maxMass.toFixed(1)} kg`);
  console.log(`  Projectile mass: ${best.particles[best.projectile].mass.toFixed(1)} kg`);
  console.log(`  Counterweight: ${maxMass.toFixed(1)} kg (${((maxMass / totalMass) * 100).toFixed(1)}% of total)`);

  // Connectivity analysis
  const connectivity = new Array(best.particles.length).fill(0);
  (best.constraints.rod || []).forEach((r) => {
    connectivity[r.p1]++;
    connectivity[r.p2]++;
  });

  const avgConnectivity =
    connectivity.reduce((a, b) => a + b, 0) / best.particles.length;
  const maxConnectivity = Math.max(...connectivity);
  const isolatedParticles = connectivity.filter((c) => c === 0).length;

  console.log(`\nConnectivity:`);
  console.log(`  Average: ${avgConnectivity.toFixed(1)} connections/particle`);
  console.log(`  Maximum: ${maxConnectivity} connections`);
  console.log(`  Isolated particles: ${isolatedParticles}`);

  // Conclusions
  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSIONS");
  console.log("=".repeat(80));

  if (discoveredRank === 1) {
    console.log("\n🎉 BREAKTHROUGH SUCCESS!");
    console.log("  Extended search discovered topology superior to all known designs!");
    console.log("  This demonstrates that sufficient search can find novel solutions.");
  } else if (discoveredRank <= 3) {
    console.log("\n✓ SIGNIFICANT SUCCESS!");
    console.log("  Extended search reached top-tier performance.");
    console.log("  Competitive with best human-designed topologies.");
  } else if (discoveredRank <= 5) {
    console.log("\n✓ SOLID SUCCESS");
    console.log("  Extended search found high-quality topology.");
    console.log("  More compute time improved results substantially.");
  } else if (discoveredRank <= presetResults.length / 2) {
    console.log("\n○ MODERATE SUCCESS");
    console.log("  Extended search improved over quick run.");
    console.log("  But still below top-performing designs.");
  } else {
    console.log("\n○ LIMITED SUCCESS");
    console.log("  Extended search found functional topology.");
    console.log("  But performance remains below human designs.");
  }

  console.log(`\n✓ ${improvementPercent}% improvement from initial population`);
  console.log(`✓ Best discovered at ${progressToFindBest}% of total generations`);

  if (last100Improvement < 1) {
    console.log(`✓ Evolution converged (no significant improvement in last 100 gens)`);
  } else {
    console.log(`! Evolution still improving (${last100Improvement.toFixed(2)} in last 100 gens)`);
    console.log(`  → Running longer might yield better results`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("SCALING INSIGHTS");
  console.log("=".repeat(80));

  console.log("\nCompared to quick run (40 pop × 40 gen = 1,600 evals):");
  console.log(`  Evaluations: 1,600 → 100,000 (62.5x more)`);
  console.log(`  Runtime: ~8s → ~${runtimeMinutes}min (${(runtimeSeconds / 8).toFixed(0)}x longer)`);
  console.log(`  Best fitness: 66.82 → ${finalBest.toFixed(2)} (${((finalBest / 66.82) * 100 - 100).toFixed(0)}% better)`);

  const efficiencyRatio = ((finalBest / 66.82 - 1) / 62.5).toFixed(4);
  console.log(`  Efficiency: ${efficiencyRatio} (improvement per 62.5x compute)`);

  if (finalBest > 66.82 * 2) {
    console.log("  → Excellent scaling: doubling compute more than doubled performance");
  } else if (finalBest > 66.82 * 1.5) {
    console.log("  → Good scaling: substantial benefit from more compute");
  } else if (finalBest > 66.82 * 1.2) {
    console.log("  → Moderate scaling: some benefit from more compute");
  } else {
    console.log("  → Poor scaling: diminishing returns from more compute");
  }

  console.log("\n" + "=".repeat(80));

  // Store results
  globalThis.extendedSearchResults = searchResult;

  // Validation
  expect(searchResult.history.length).toBe(1000);
  expect(searchResult.bestEver).toBeDefined();
  expect(searchResult.bestEver.fitness).toBeGreaterThan(0);
});
