import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints } from "./trebuchetsimulation.js";
import * as fs from "fs";

test("analyze scale factor exploit", () => {
  console.log("\n" + "=".repeat(80));
  console.log("SCALE FACTOR ANALYSIS");
  console.log("=".repeat(80));

  const data = JSON.parse(fs.readFileSync("/home/user/jstreb/cmaes-fixed-results.json", "utf8"));
  const config = data.champion.config;

  fillEmptyConstraints(config);

  function terminate(trajectories) {
    if (trajectories.length === 0) return false;
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * config.projectile + 1];
    var projectileVY = -trajectory[2 * config.particles.length + 2 * config.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  const [trajectories] = simulate(
    config.particles,
    config.constraints,
    config.timestep,
    config.duration,
    terminate
  );

  const numParticles = config.particles.length;

  // Replicate the calculateRange logic
  let axlecoord = -config.particles[config.mainaxle].y;
  let mincoord = -config.particles[config.mainaxle].y;
  let maxUnitlessRange = 0;

  for (const trajectory of trajectories) {
    for (let partIndex = 0; partIndex < numParticles; partIndex++) {
      if (trajectory[2 * partIndex] < 2000) {
        mincoord = Math.min(mincoord, -trajectory[2 * partIndex + 1]);
      }
    }
    axlecoord = Math.max(axlecoord, -trajectory[2 * config.mainaxle + 1]);

    // Calculate unitless range at this timestep
    const vy = -trajectory[2 * numParticles + 2 * config.projectile + 1];
    const vx = trajectory[2 * numParticles + 2 * config.projectile];
    const unitlessRange = 2 * Math.max(0, vy) * vx;
    maxUnitlessRange = Math.max(maxUnitlessRange, unitlessRange);
  }

  const effectiveHeight = axlecoord - mincoord;
  const scaleFactor = config.axleheight / effectiveHeight;
  const scaledRange = maxUnitlessRange * scaleFactor;

  console.log("\nSEMANTIC INTERPRETATION:");
  console.log("=".repeat(80));
  console.log("Unitless simulation → Real world via scaling\n");

  console.log("1. UNITLESS SIMULATION:");
  console.log(`  Mainaxle max Y: ${axlecoord.toFixed(4)} (top of transportable part)`);
  console.log(`  Lowest point Y: ${mincoord.toFixed(4)} (bottom of machine)`);
  console.log(`  Effective height: ${effectiveHeight.toFixed(4)} units`);
  console.log(`  Max unitless range: ${maxUnitlessRange.toFixed(2)} unitless`);

  console.log("\n2. SCALING TO REAL WORLD:");
  console.log(`  Target axle height: ${config.axleheight} ft (bridge clearance)`);
  console.log(`  Scale factor: ${config.axleheight} / ${effectiveHeight.toFixed(4)} = ${scaleFactor.toFixed(2)}x`);
  console.log(`  Scaled range: ${maxUnitlessRange.toFixed(2)} × ${scaleFactor.toFixed(2)} = ${scaledRange.toFixed(2)} ft`);

  console.log("\n3. THE EXPLOIT:");
  console.log("=".repeat(80));

  if (effectiveHeight < 1.0) {
    console.log(`✗ EXPLOIT DETECTED: Effective height = ${effectiveHeight.toFixed(6)} units`);
    console.log(`  Machine is extremely thin vertically!`);
    console.log(`  This creates scale factor of ${scaleFactor.toFixed(0)}x`);
    console.log(`  Turning ${maxUnitlessRange.toFixed(0)} unitless → ${scaledRange.toFixed(0)} ft`);
    console.log(`\n  CMA-ES learned to minimize (axlecoord - mincoord) → 0`);
    console.log(`  This maximizes scale factor → ∞`);
    console.log(`  Semantic constraint violated: machine must have reasonable height`);
  } else {
    console.log(`✓ Reasonable effective height: ${effectiveHeight.toFixed(2)} units`);
    console.log(`  Scale factor: ${scaleFactor.toFixed(2)}x`);
  }

  // Compare particles vertical spread
  console.log("\n4. PARTICLE VERTICAL SPREAD:");
  console.log("=".repeat(80));

  const particleYs = config.particles.map(p => p.y);
  const initialMinY = Math.min(...particleYs);
  const initialMaxY = Math.max(...particleYs);
  const initialSpread = initialMaxY - initialMinY;

  console.log(`Initial particle Y positions:`);
  config.particles.forEach((p, i) => {
    const marker = i === config.mainaxle ? " (MAINAXLE)" : "";
    console.log(`  Particle ${i}: Y = ${p.y.toFixed(2)}${marker}`);
  });

  console.log(`\nInitial spread: ${initialMaxY.toFixed(2)} - ${initialMinY.toFixed(2)} = ${initialSpread.toFixed(2)}`);
  console.log(`Trajectory spread: ${axlecoord.toFixed(2)} - ${mincoord.toFixed(2)} = ${effectiveHeight.toFixed(2)}`);

  if (initialSpread < 50) {
    console.log(`\n⚠️  Particles clustered within ${initialSpread.toFixed(2)} units vertically`);
    console.log(`   Search space is 350-650, so this is ${(initialSpread/300*100).toFixed(1)}% of range`);
  }

  // Check what a "normal" machine would get
  console.log("\n5. COMPARISON WITH REASONABLE MACHINE:");
  console.log("=".repeat(80));

  const reasonableHeight = 200; // units
  const reasonableScaleFactor = config.axleheight / reasonableHeight;
  const reasonableRange = maxUnitlessRange * reasonableScaleFactor;

  console.log(`If effective height = ${reasonableHeight} units (reasonable):`);
  console.log(`  Scale factor: ${config.axleheight} / ${reasonableHeight} = ${reasonableScaleFactor.toFixed(3)}x`);
  console.log(`  Range: ${maxUnitlessRange.toFixed(2)} × ${reasonableScaleFactor.toFixed(3)} = ${reasonableRange.toFixed(2)} ft`);
  console.log(`\nVs actual champion:`);
  console.log(`  Scale factor: ${scaleFactor.toFixed(2)}x (${(scaleFactor/reasonableScaleFactor).toFixed(0)}x larger)`);
  console.log(`  Range: ${scaledRange.toFixed(2)} ft (${(scaledRange/reasonableRange).toFixed(0)}x larger)`);

  console.log("\n" + "=".repeat(80));
  console.log("CONCLUSION");
  console.log("=".repeat(80));

  console.log("\nThe CMA-ES optimizer correctly found:");
  console.log("  max(range) = max(unitless_range × axleheight / effective_height)");
  console.log("\nBy minimizing effective_height → 0:");
  console.log("  → scale_factor → ∞");
  console.log("  → range → ∞");
  console.log("\nThis violates the semantic constraint:");
  console.log("  'Machine must have reasonable height to be buildable'");
  console.log("\nFix: Add constraint on minimum effective height");
  console.log(`  Example: effective_height >= 100 units`);

  console.log("\n" + "=".repeat(80));

  expect(trajectories.length).toBeGreaterThan(0);
});
