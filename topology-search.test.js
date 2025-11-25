import { expect, test } from "vitest";
import { searchTopologies, evaluateTopology } from "./topology-search.js";
import { presets } from "./trebuchetsimulation.js";

test("topology search experiment", { timeout: 900000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("EXPERIMENT: Can We Discover Good Topologies via Search?");
  console.log("=".repeat(80));
  console.log("\nGoal: Search the topology space to discover high-range designs");
  console.log("      without using knowledge of known-good topologies.\n");
  console.log("Approach: Genetic algorithm with topology mutation operators");
  console.log("          - Add/remove particles");
  console.log("          - Add/remove constraints (rods, sliders)");
  console.log("          - Modify positions and masses");
  console.log("=".repeat(80));

  // Run topology search
  const searchResult = searchTopologies({
    populationSize: 40,
    generations: 40,
    eliteCount: 5,
    mutationRate: 0.3,
    seed: 77777,
    verbose: true,
  });

  console.log("\n" + "=".repeat(80));
  console.log("DISCOVERED TOPOLOGY DETAILS");
  console.log("=".repeat(80));
  console.log("\nBest discovered configuration:");
  console.log(JSON.stringify(searchResult.bestEver.config, null, 2));

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

  const discoveredRank = presetResults.filter(
    (r) => r.fitness > searchResult.bestEver.fitness
  ).length + 1;

  console.log(`\nDiscovered topology: ${searchResult.bestEver.range.toFixed(2)}`);
  console.log(
    `Rank: ${discoveredRank}/${presetResults.length + 1} (${discoveredRank === 1 ? "BEST!" : discoveredRank <= 3 ? "Top 3" : discoveredRank <= 5 ? "Top 5" : "Lower"})`
  );

  // Evolution progress
  console.log("\n" + "=".repeat(80));
  console.log("EVOLUTION PROGRESS");
  console.log("=".repeat(80));

  const milestones = [0, 9, 19, 29, 39];
  console.log("\nFitness over generations:");
  milestones.forEach((gen) => {
    if (gen < searchResult.history.length) {
      const h = searchResult.history[gen];
      console.log(
        `  Gen ${gen}: Max=${h.maxFitness.toFixed(2)}, Avg=${h.avgFitness.toFixed(2)}, Valid=${h.validCount}/40`
      );
    }
  });

  const initialBest = searchResult.history[0].maxFitness;
  const finalBest = searchResult.bestEver.fitness;
  const improvement = finalBest - initialBest;
  const improvementPercent =
    initialBest > 0 ? ((improvement / initialBest) * 100).toFixed(1) : "∞";

  console.log(
    `\nImprovement: ${initialBest.toFixed(2)} → ${finalBest.toFixed(2)} (+${improvementPercent}%)`
  );

  // Analyze topology characteristics
  console.log("\n" + "=".repeat(80));
  console.log("DISCOVERED TOPOLOGY CHARACTERISTICS");
  console.log("=".repeat(80));

  const best = searchResult.bestEver.config;
  console.log(`\nParticles: ${best.particles.length}`);
  console.log(`Rods: ${best.constraints.rod?.length || 0}`);
  console.log(`Sliders: ${best.constraints.slider?.length || 0}`);
  console.log(`Pins: ${best.constraints.pin?.length || 0}`);

  // Mass distribution
  const masses = best.particles.map((p) => p.mass);
  const totalMass = masses.reduce((a, b) => a + b, 0);
  const maxMass = Math.max(...masses);
  const minMass = Math.min(...masses);

  console.log(`\nMass distribution:`);
  console.log(`  Total: ${totalMass.toFixed(1)}`);
  console.log(`  Range: ${minMass.toFixed(1)} - ${maxMass.toFixed(1)}`);
  console.log(`  Projectile mass: ${best.particles[best.projectile].mass.toFixed(1)}`);

  // Constraint analysis
  const hasAxleSlider = (best.constraints.slider || []).some(
    (s) => s.p === best.mainaxle
  );
  const hasProjectileRelease = (best.constraints.slider || []).some(
    (s) => s.p === best.projectile && s.oneway
  );
  const numOnewayRods = (best.constraints.rod || []).filter((r) => r.oneway)
    .length;

  console.log(`\nMechanical features:`);
  console.log(`  Axle slider: ${hasAxleSlider ? "Yes" : "No"}`);
  console.log(`  Projectile release: ${hasProjectileRelease ? "Yes" : "No"}`);
  console.log(`  One-way rods: ${numOnewayRods}`);

  // Connectivity analysis
  const connectivity = new Array(best.particles.length).fill(0);
  (best.constraints.rod || []).forEach((r) => {
    connectivity[r.p1]++;
    connectivity[r.p2]++;
  });

  const avgConnectivity =
    connectivity.reduce((a, b) => a + b, 0) / best.particles.length;
  const maxConnectivity = Math.max(...connectivity);

  console.log(`\nConnectivity:`);
  console.log(`  Average: ${avgConnectivity.toFixed(1)} rods per particle`);
  console.log(`  Maximum: ${maxConnectivity} rods at one particle`);

  // Conclusions
  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSIONS");
  console.log("=".repeat(80));

  if (discoveredRank === 1) {
    console.log("\n✓ BREAKTHROUGH: Discovered topology BEATS all known designs!");
    console.log(
      "  This suggests the search successfully explored novel topologies."
    );
  } else if (discoveredRank <= 3) {
    console.log("\n✓ SUCCESS: Discovered topology ranks in TOP 3");
    console.log(
      "  Competitive with best known designs despite no domain knowledge."
    );
  } else if (discoveredRank <= 5) {
    console.log("\n○ PARTIAL SUCCESS: Discovered topology ranks in TOP 5");
    console.log("  Found functional design but not optimal.");
  } else if (finalBest > 0) {
    console.log("\n○ MODEST SUCCESS: Found functional topology");
    console.log(
      `  Rank ${discoveredRank}/${presetResults.length + 1}, but demonstrates search is viable.`
    );
  } else {
    console.log("\n✗ LIMITED SUCCESS: Best discovered topology has zero range");
    console.log("  Search struggled to find functional designs.");
    console.log("  Topology space may be too large for this approach.");
  }

  if (improvement > 0) {
    console.log(`\n✓ Evolution worked: ${improvementPercent}% improvement over ${searchResult.history.length} generations`);
  } else {
    console.log("\n✗ Evolution stalled: No improvement from initial population");
  }

  // Analysis of search difficulty
  const avgValidCount =
    searchResult.history.reduce((sum, h) => sum + h.validCount, 0) /
    searchResult.history.length;
  const validPercent = ((avgValidCount / 40) * 100).toFixed(1);

  console.log(`\nSearch difficulty:`);
  console.log(`  Average valid topologies: ${avgValidCount.toFixed(1)}/40 (${validPercent}%)`);

  if (validPercent < 20) {
    console.log(
      "  → Very hard: Most random topologies are non-functional"
    );
  } else if (validPercent < 50) {
    console.log("  → Moderate: Roughly half of topologies work");
  } else {
    console.log("  → Easy: Most topologies are functional");
  }

  console.log("\n" + "=".repeat(80));
  console.log("KEY INSIGHTS");
  console.log("=".repeat(80));

  console.log("\n1. Topology search is MUCH harder than parameter optimization");
  console.log("   - Discrete, combinatorial search space");
  console.log("   - Most random topologies are non-functional");
  console.log("   - Small changes can completely break functionality");

  console.log("\n2. Human insight vs. algorithmic search:");
  if (discoveredRank <= 3) {
    console.log("   - Search can discover competitive designs!");
    console.log("   - But requires many evaluations (>1000 simulations)");
  } else {
    console.log("   - Known designs represent centuries of human insight");
    console.log("   - Hard to replicate with simple genetic algorithm");
    console.log("   - Domain knowledge provides huge advantage");
  }

  console.log("\n3. Evolution can improve initial random population");
  console.log(
    `   - Improvement: ${improvementPercent}% (${initialBest.toFixed(2)} → ${finalBest.toFixed(2)})`
  );
  console.log("   - But starting point and search space matter greatly");

  console.log("\n" + "=".repeat(80));

  // Store results for further analysis
  globalThis.topologySearchResults = searchResult;

  // Basic validation
  expect(searchResult.history.length).toBe(40);
  expect(searchResult.bestEver).toBeDefined();
  expect(searchResult.bestEver.fitness).toBeGreaterThanOrEqual(0);
});
