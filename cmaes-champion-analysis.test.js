import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange } from "./trebuchetsimulation.js";
import * as fs from "fs";

test("analyze absurd CMA-ES champion", () => {
  console.log("\n" + "=".repeat(80));
  console.log("ANALYZING 4.78 TRILLION FOOT CHAMPION");
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

  const [trajectories, constraintLog, forceLog] = simulate(
    config.particles,
    config.constraints,
    config.timestep,
    config.duration,
    terminate
  );

  const range = calculateRange(trajectories, config);
  const numParticles = config.particles.length;

  console.log("\n1. BASIC METRICS");
  console.log("=".repeat(80));
  console.log(`Reported range: ${range.toFixed(2)} ft = ${(range/5280000).toFixed(2)} thousand miles`);
  console.log(`Simulation steps: ${trajectories.length}`);
  console.log(`Duration: ${(trajectories.length * config.timestep).toFixed(2)}s (limit: ${config.duration}s)`);

  // Find projectile velocities
  console.log("\n2. PROJECTILE ANALYSIS");
  console.log("=".repeat(80));

  let maxSpeed = 0;
  let maxSpeedIdx = 0;
  const projectileIdx = config.projectile;

  for (let i = 0; i < trajectories.length; i++) {
    const state = trajectories[i];
    const vx = state[2 * numParticles + 2 * projectileIdx];
    const vy = state[2 * numParticles + 2 * projectileIdx + 1];
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > maxSpeed) {
      maxSpeed = speed;
      maxSpeedIdx = i;
    }
  }

  const launchState = trajectories[maxSpeedIdx];
  const launchVx = launchState[2 * numParticles + 2 * projectileIdx];
  const launchVy = launchState[2 * numParticles + 2 * projectileIdx + 1];
  const launchSpeed = Math.sqrt(launchVx * launchVx + launchVy * launchVy);

  console.log(`Max projectile speed: ${launchSpeed.toFixed(2)} m/s`);
  console.log(`  at time: ${(maxSpeedIdx * config.timestep).toFixed(2)}s`);
  console.log(`  velocity: (${launchVx.toFixed(2)}, ${launchVy.toFixed(2)}) m/s`);

  const speedOfSound = 343;
  const mach = launchSpeed / speedOfSound;
  const speedOfLight = 299792458;
  const fractionOfLightSpeed = launchSpeed / speedOfLight;

  console.log(`  Mach number: ${mach.toFixed(4)}`);
  console.log(`  Fraction of light speed: ${fractionOfLightSpeed.toFixed(10)}`);

  if (launchSpeed > 1000) {
    console.log(`  ⚠️  IMPOSSIBLE: Speed exceeds reasonable limits!`);
  }

  // Check final position
  console.log("\n3. FINAL POSITION");
  console.log("=".repeat(80));

  const finalState = trajectories[trajectories.length - 1];
  const finalX = finalState[2 * projectileIdx];
  const finalY = -finalState[2 * projectileIdx + 1];
  const finalVx = finalState[2 * numParticles + 2 * projectileIdx];
  const finalVy = finalState[2 * numParticles + 2 * projectileIdx + 1];
  const finalSpeed = Math.sqrt(finalVx * finalVx + finalVy * finalVy);

  console.log(`Final X: ${finalX.toFixed(2)} m = ${(finalX * 3.28084).toFixed(2)} ft`);
  console.log(`Final Y: ${finalY.toFixed(2)} m`);
  console.log(`Final velocity: (${finalVx.toFixed(2)}, ${finalVy.toFixed(2)}) m/s`);
  console.log(`Final speed: ${finalSpeed.toFixed(2)} m/s`);

  // Check if hit duration limit
  const hitDurationLimit = (trajectories.length - 1) * config.timestep >= config.duration;
  if (hitDurationLimit) {
    console.log(`\n⚠️  Simulation hit duration limit (${config.duration}s)`);
    console.log(`   Projectile still in flight!`);
  }

  // Theoretical range check
  console.log("\n4. THEORETICAL RANGE");
  console.log("=".repeat(80));

  const g = 1; // gravity in sim
  const theoreticalMaxRange = (launchSpeed * launchSpeed) / g;

  console.log(`Based on max speed (${launchSpeed.toFixed(2)} m/s):`);
  console.log(`  Theoretical max range: ${(theoreticalMaxRange * 3.28084).toFixed(2)} ft`);
  console.log(`  Reported range: ${range.toFixed(2)} ft`);
  console.log(`  Ratio: ${(range / (theoreticalMaxRange * 3.28084)).toFixed(2)}x`);

  if (range / (theoreticalMaxRange * 3.28084) > 10) {
    console.log(`  ⚠️  Range is ${(range / (theoreticalMaxRange * 3.28084)).toFixed(1)}x theoretical max!`);
  }

  // Check masses
  console.log("\n5. MASS ANALYSIS");
  console.log("=".repeat(80));

  const masses = config.particles.map(p => p.mass);
  const minMass = Math.min(...masses);
  const maxMass = Math.max(...masses);
  const projectileMass = config.particles[projectileIdx].mass;

  console.log(`Projectile mass: ${projectileMass.toFixed(2)} kg`);
  console.log(`Min particle mass: ${minMass.toFixed(2)} kg`);
  console.log(`Max particle mass: ${maxMass.toFixed(2)} kg`);
  console.log(`Total mass: ${masses.reduce((a, b) => a + b, 0).toFixed(2)} kg`);

  const minMassCount = masses.filter(m => m === 1).length;
  console.log(`Particles at minimum mass (1 kg): ${minMassCount}/${numParticles}`);

  // Check positions
  console.log("\n6. POSITION ANALYSIS");
  console.log("=".repeat(80));

  let atBoundary = 0;
  for (let i = 0; i < numParticles; i++) {
    const x = config.particles[i].x;
    const y = config.particles[i].y;
    if (Math.abs(x - 350) < 1 || Math.abs(x - 650) < 1 ||
        Math.abs(y - 350) < 1 || Math.abs(y - 650) < 1) {
      atBoundary++;
    }
  }

  console.log(`Particles at position boundaries: ${atBoundary}/${numParticles}`);

  // Energy analysis
  console.log("\n7. ENERGY ANALYSIS");
  console.log("=".repeat(80));

  const initialState = trajectories[0];
  let initialKE = 0;
  let initialPE = 0;
  let finalKE = 0;
  let finalPE = 0;

  for (let i = 0; i < numParticles; i++) {
    const mass = masses[i];

    // Initial
    const y0 = -initialState[2 * i + 1];
    const vx0 = initialState[2 * numParticles + 2 * i];
    const vy0 = initialState[2 * numParticles + 2 * i + 1];
    initialKE += 0.5 * mass * (vx0 * vx0 + vy0 * vy0);
    initialPE += mass * g * y0;

    // Final
    const yF = -finalState[2 * i + 1];
    const vxF = finalState[2 * numParticles + 2 * i];
    const vyF = finalState[2 * numParticles + 2 * i + 1];
    finalKE += 0.5 * mass * (vxF * vxF + vyF * vyF);
    finalPE += mass * g * yF;
  }

  const initialE = initialKE + initialPE;
  const finalE = finalKE + finalPE;
  const energyChange = finalE - initialE;
  const energyPercent = (energyChange / Math.abs(initialE)) * 100;

  console.log(`Initial energy: ${initialE.toFixed(2)} J (KE=${initialKE.toFixed(2)}, PE=${initialPE.toFixed(2)})`);
  console.log(`Final energy: ${finalE.toFixed(2)} J (KE=${finalKE.toFixed(2)}, PE=${finalPE.toFixed(2)})`);
  console.log(`Energy change: ${energyChange.toFixed(2)} J (${energyPercent.toFixed(2)}%)`);

  if (Math.abs(energyPercent) > 5) {
    console.log(`⚠️  Energy conservation violated by ${Math.abs(energyPercent).toFixed(2)}%`);
  }

  // Conclusion
  console.log("\n" + "=".repeat(80));
  console.log("DIAGNOSIS");
  console.log("=".repeat(80));

  const issues = [];

  if (range > 1e6) {
    issues.push(`Impossible range (${(range/5280000).toFixed(0)}K miles)`);
  }

  if (launchSpeed > 1000) {
    issues.push(`Impossible launch speed (${launchSpeed.toFixed(0)} m/s = Mach ${mach.toFixed(1)})`);
  }

  if (range / (theoreticalMaxRange * 3.28084) > 10) {
    issues.push(`Range exceeds physics by ${(range / (theoreticalMaxRange * 3.28084)).toFixed(0)}x`);
  }

  if (minMassCount >= 3) {
    issues.push(`${minMassCount} particles at minimum mass (boundary exploitation)`);
  }

  if (atBoundary >= 3) {
    issues.push(`${atBoundary} particles at position boundaries`);
  }

  if (issues.length > 0) {
    console.log("\n✗ EXPLOIT DETECTED");
    console.log("\nIssues:");
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
  } else {
    console.log("\n✓ Design appears valid");
  }

  console.log("\n" + "=".repeat(80));

  expect(trajectories.length).toBeGreaterThan(0);
});
