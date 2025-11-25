import { expect, test } from "vitest";
import { createInitialPopulation, mutateTopology } from "./constrained-topology-search.js";

test("mainaxle is set to highest particle with pin or slider", () => {
  console.log("\n" + "=".repeat(80));
  console.log("TESTING MAINAXLE ASSIGNMENT");
  console.log("=".repeat(80));

  // Create initial population
  const population = createInitialPopulation(10, 42);

  console.log("\nChecking initial population:");
  for (let i = 0; i < population.length; i++) {
    const config = population[i];

    // Find particles with pins or sliders
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

    // Find highest particle with constraints
    let highestY = -Infinity;
    let highestParticle = -1;

    for (const particleIdx of particlesWithConstraints) {
      const y = config.particles[particleIdx].y;
      if (y > highestY) {
        highestY = y;
        highestParticle = particleIdx;
      }
    }

    console.log(`  Individual ${i}:`);
    console.log(`    Mainaxle: ${config.mainaxle}`);
    console.log(`    Expected highest: ${highestParticle} (Y=${highestY.toFixed(2)})`);
    console.log(`    Mainaxle Y: ${config.particles[config.mainaxle].y.toFixed(2)}`);
    console.log(`    Particles with constraints: ${Array.from(particlesWithConstraints).join(", ")}`);

    if (particlesWithConstraints.size > 0) {
      expect(config.mainaxle).toBe(highestParticle);
      console.log(`    ✓ Correct`);
    } else {
      console.log(`    ○ No constraints, mainaxle=${config.mainaxle}`);
    }
  }

  // Test mutation
  console.log("\n" + "=".repeat(80));
  console.log("TESTING MUTATION UPDATES MAINAXLE");
  console.log("=".repeat(80));

  let rngSeed = 99999;
  function rng() {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  }

  const original = population[0];
  console.log(`\nOriginal mainaxle: ${original.mainaxle} at Y=${original.particles[original.mainaxle].y.toFixed(2)}`);

  // Mutate 5 times
  let mutated = original;
  for (let i = 0; i < 5; i++) {
    mutated = mutateTopology(mutated, rng, 0.8);

    // Verify mainaxle is highest with constraints
    const particlesWithConstraints = new Set();

    if (mutated.constraints.pin) {
      for (const pin of mutated.constraints.pin) {
        particlesWithConstraints.add(pin.p);
      }
    }

    if (mutated.constraints.slider) {
      for (const slider of mutated.constraints.slider) {
        particlesWithConstraints.add(slider.p);
      }
    }

    let highestY = -Infinity;
    let highestParticle = -1;

    for (const particleIdx of particlesWithConstraints) {
      if (particleIdx < mutated.particles.length) {
        const y = mutated.particles[particleIdx].y;
        if (y > highestY) {
          highestY = y;
          highestParticle = particleIdx;
        }
      }
    }

    console.log(`\nMutation ${i + 1}:`);
    console.log(`  Particles: ${mutated.particles.length}`);
    console.log(`  Mainaxle: ${mutated.mainaxle} at Y=${mutated.particles[mutated.mainaxle].y.toFixed(2)}`);
    console.log(`  Expected highest: ${highestParticle} (Y=${highestY.toFixed(2)})`);
    console.log(`  Particles with constraints: ${Array.from(particlesWithConstraints).join(", ")}`);

    if (particlesWithConstraints.size > 0) {
      expect(mutated.mainaxle).toBe(highestParticle);
      console.log(`  ✓ Mainaxle correctly updated`);
    } else {
      console.log(`  ○ No constraints`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✓ All mainaxle assignments correct!");
  console.log("=".repeat(80) + "\n");
});
