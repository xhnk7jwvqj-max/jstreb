import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from "./trebuchetsimulation.js";
import * as fs from "fs";

/**
 * Deep analysis of the constrained champion to understand if it's physically realistic
 */
test("constrained champion deep analysis", { timeout: 60000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("CONSTRAINED CHAMPION: DEEP PHYSICAL ANALYSIS");
  console.log("=".repeat(80));

  const data = JSON.parse(fs.readFileSync("/home/user/jstreb/constrained-search-results.json", "utf8"));
  const config = data.constrainedChampion.config;

  fillEmptyConstraints(config);

  // Termination condition
  function terminate(trajectories) {
    if (trajectories.length === 0) return false;
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * config.projectile + 1];
    var projectileVY = -trajectory[2 * config.particles.length + 2 * config.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  // Run simulation
  const [trajectories, constraintLog, forceLog] = simulate(
    config.particles,
    config.constraints,
    config.timestep,
    config.duration,
    terminate
  );

  console.log("\n1. BASIC METRICS");
  console.log("=".repeat(80));

  const range = calculateRange(trajectories, config);
  const peakLoad = calculatePeakLoad(forceLog);

  console.log(`Range: ${range.toFixed(2)} ft = ${(range / 5280).toFixed(2)} miles`);
  console.log(`Peak load: ${peakLoad.toFixed(2)} lbf`);
  console.log(`Simulation steps: ${trajectories.length}`);
  console.log(`Duration: ${(trajectories.length * config.timestep).toFixed(2)}s`);

  // Analyze masses
  console.log("\n2. MASS DISTRIBUTION");
  console.log("=".repeat(80));

  const totalMass = config.particles.reduce((sum, p) => sum + p.mass, 0);
  const projectileMass = config.particles[config.projectile].mass;
  const counterweightMass = totalMass - projectileMass;

  console.log(`Projectile mass: ${projectileMass.toFixed(2)} kg (particle ${config.projectile})`);
  console.log(`Other masses: ${counterweightMass.toFixed(2)} kg`);
  console.log(`Total mass: ${totalMass.toFixed(2)} kg`);
  console.log(`Mass ratio: ${(counterweightMass / projectileMass).toFixed(2)}:1`);

  // Analyze initial state
  console.log("\n3. INITIAL STATE ANALYSIS");
  console.log("=".repeat(80));

  const initialState = trajectories[0];
  const numParticles = config.particles.length;

  let initialKE = 0;
  let initialPE = 0;
  const g = 1; // gravity in simulation

  for (let i = 0; i < numParticles; i++) {
    const mass = config.particles[i].mass;
    const y = -initialState[2 * i + 1];
    const vx = initialState[2 * numParticles + 2 * i];
    const vy = initialState[2 * numParticles + 2 * i + 1];

    initialKE += 0.5 * mass * (vx * vx + vy * vy);
    initialPE += mass * g * y;
  }

  const initialEnergy = initialKE + initialPE;

  console.log(`Initial kinetic energy: ${initialKE.toFixed(2)} J`);
  console.log(`Initial potential energy: ${initialPE.toFixed(2)} J`);
  console.log(`Initial total energy: ${initialEnergy.toFixed(2)} J`);

  // Analyze release velocity
  console.log("\n4. PROJECTILE LAUNCH ANALYSIS");
  console.log("=".repeat(80));

  // Find when projectile is released (maximum velocity or when it starts falling)
  let maxSpeed = 0;
  let maxSpeedIdx = 0;
  let maxHeight = -Infinity;
  let maxHeightIdx = 0;

  for (let i = 0; i < trajectories.length; i++) {
    const state = trajectories[i];
    const vx = state[2 * numParticles + 2 * config.projectile];
    const vy = state[2 * numParticles + 2 * config.projectile + 1];
    const speed = Math.sqrt(vx * vx + vy * vy);
    const y = -state[2 * config.projectile + 1];

    if (speed > maxSpeed) {
      maxSpeed = speed;
      maxSpeedIdx = i;
    }

    if (y > maxHeight) {
      maxHeight = y;
      maxHeightIdx = i;
    }
  }

  const launchState = trajectories[maxSpeedIdx];
  const launchVx = launchState[2 * numParticles + 2 * config.projectile];
  const launchVy = launchState[2 * numParticles + 2 * config.projectile + 1];
  const launchSpeed = Math.sqrt(launchVx * launchVx + launchVy * launchVy);
  const launchAngle = Math.atan2(launchVy, launchVx) * 180 / Math.PI;

  console.log(`Maximum projectile speed: ${launchSpeed.toFixed(2)} m/s`);
  console.log(`  at time: ${(maxSpeedIdx * config.timestep).toFixed(2)}s`);
  console.log(`  velocity: (${launchVx.toFixed(2)}, ${launchVy.toFixed(2)}) m/s`);
  console.log(`  angle: ${launchAngle.toFixed(2)}°`);
  console.log(`Maximum height: ${maxHeight.toFixed(2)} m`);
  console.log(`  at time: ${(maxHeightIdx * config.timestep).toFixed(2)}s`);

  // Calculate kinetic energy at launch
  const launchKE = 0.5 * projectileMass * launchSpeed * launchSpeed;
  console.log(`Projectile kinetic energy at launch: ${launchKE.toFixed(2)} J`);

  // Energy analysis
  console.log("\n5. ENERGY BUDGET ANALYSIS");
  console.log("=".repeat(80));

  console.log(`Energy available (initial): ${initialEnergy.toFixed(2)} J`);
  console.log(`Energy in projectile at launch: ${launchKE.toFixed(2)} J`);
  console.log(`Fraction of total energy: ${((launchKE / initialEnergy) * 100).toFixed(2)}%`);

  if (launchKE > initialEnergy * 1.05) {
    console.log(`⚠️  WARNING: Launch energy EXCEEDS initial energy by ${((launchKE / initialEnergy - 1) * 100).toFixed(2)}%`);
    console.log(`    This violates energy conservation!`);
  }

  // Theoretical range check
  console.log("\n6. THEORETICAL RANGE VERIFICATION");
  console.log("=".repeat(80));

  // Optimal angle is 45° for maximum range
  const theoreticalMaxRange = (launchSpeed * launchSpeed) / g; // v²/g for 45° angle
  console.log(`Theoretical max range (45° angle): ${theoreticalMaxRange.toFixed(2)} m = ${(theoreticalMaxRange * 3.28084).toFixed(2)} ft`);
  console.log(`Actual range: ${range.toFixed(2)} ft`);
  console.log(`Ratio: ${((range / (theoreticalMaxRange * 3.28084))).toFixed(3)}`);

  // Physical plausibility check
  console.log("\n7. PHYSICAL PLAUSIBILITY CHECK");
  console.log("=".repeat(80));

  const speedOfSound = 343; // m/s
  const mach = launchSpeed / speedOfSound;

  console.log(`Launch speed: ${launchSpeed.toFixed(2)} m/s`);
  console.log(`Mach number: ${mach.toFixed(3)}`);

  if (mach > 0.3) {
    console.log(`⚠️  WARNING: Speed is ${(mach * 100).toFixed(1)}% of sound speed`);
    console.log(`    Trebuchets typically achieve 50-100 m/s (Mach 0.15-0.3)`);
  }

  if (range > 50000) {
    console.log(`⚠️  WARNING: Range is ${(range / 5280).toFixed(2)} miles`);
    console.log(`    World record trebuchet: ~400 m (1,300 ft)`);
    console.log(`    This design: ${(range / 400 / 3.28084).toFixed(1)}x world record`);
  }

  // Energy efficiency
  const efficiency = (launchKE / initialEnergy) * 100;
  console.log(`\nEnergy efficiency: ${efficiency.toFixed(2)}%`);

  if (efficiency > 90) {
    console.log(`⚠️  WARNING: Efficiency > 90% is unrealistic`);
    console.log(`    Real trebuchets: 30-60% efficient`);
  }

  // Check for initial height advantage
  console.log("\n8. HEIGHT ADVANTAGE ANALYSIS");
  console.log("=".repeat(80));

  const initialHeights = config.particles.map((p, i) => -trajectories[0][2 * i + 1]);
  const maxInitialHeight = Math.max(...initialHeights);
  const minInitialHeight = Math.min(...initialHeights);

  console.log(`Initial height range: ${minInitialHeight.toFixed(2)} to ${maxInitialHeight.toFixed(2)} m`);
  console.log(`Height difference: ${(maxInitialHeight - minInitialHeight).toFixed(2)} m`);

  // Conclusion
  console.log("\n" + "=".repeat(80));
  console.log("ASSESSMENT");
  console.log("=".repeat(80));

  let physicallyRealistic = true;
  const issues = [];

  if (mach > 0.5) {
    physicallyRealistic = false;
    issues.push(`Launch speed too high (Mach ${mach.toFixed(2)})`);
  }

  if (efficiency > 90) {
    physicallyRealistic = false;
    issues.push(`Unrealistic efficiency (${efficiency.toFixed(1)}%)`);
  }

  if (launchKE > initialEnergy * 1.05) {
    physicallyRealistic = false;
    issues.push(`Energy conservation violated`);
  }

  if (range > 10000) {
    physicallyRealistic = false;
    issues.push(`Range exceeds physical limits (${(range / 5280).toFixed(2)} miles)`);
  }

  if (physicallyRealistic) {
    console.log("\n✓ Design appears PHYSICALLY REALISTIC");
    console.log("  All metrics within expected ranges");
  } else {
    console.log("\n✗ Design appears to be SIMULATION ARTIFACT");
    console.log("\nIssues identified:");
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  }

  console.log("\n" + "=".repeat(80));

  // Save detailed analysis
  const analysis = {
    range: range,
    rangeInMiles: range / 5280,
    peakLoad: peakLoad,
    masses: {
      projectile: projectileMass,
      counterweight: counterweightMass,
      total: totalMass,
      ratio: counterweightMass / projectileMass,
    },
    energy: {
      initial: initialEnergy,
      launchKE: launchKE,
      efficiency: efficiency,
    },
    launch: {
      speed: launchSpeed,
      mach: mach,
      angle: launchAngle,
      vx: launchVx,
      vy: launchVy,
    },
    plausibility: {
      realistic: physicallyRealistic,
      issues: issues,
    },
    simulation: {
      steps: trajectories.length,
      duration: trajectories.length * config.timestep,
      timestep: config.timestep,
    },
  };

  fs.writeFileSync(
    "/home/user/jstreb/constrained-champion-deep-analysis.json",
    JSON.stringify(analysis, null, 2)
  );

  console.log("✓ Detailed analysis saved to constrained-champion-deep-analysis.json\n");

  expect(trajectories.length).toBeGreaterThan(0);
});
