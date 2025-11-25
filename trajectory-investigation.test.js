import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints } from "./trebuchetsimulation.js";
import * as fs from "fs";

test("investigate projectile trajectory", { timeout: 60000 }, () => {
  console.log("\n" + "=".repeat(80));
  console.log("PROJECTILE TRAJECTORY INVESTIGATION");
  console.log("=".repeat(80));

  const data = JSON.parse(fs.readFileSync("/home/user/jstreb/constrained-search-results.json", "utf8"));
  const config = data.constrainedChampion.config;

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

  console.log("\n1. TRAJECTORY SNAPSHOTS");
  console.log("=".repeat(80));

  const numParticles = config.particles.length;
  const snapshots = [0, 10, 30, 50, 80, 116];

  console.log("\nProjectile position over time:");
  console.log("Time(s) | X(m)        | Y(m)        | Vx(m/s)  | Vy(m/s)  | Speed(m/s)");
  console.log("-".repeat(80));

  for (const idx of snapshots) {
    if (idx >= trajectories.length) continue;

    const state = trajectories[idx];
    const time = idx * config.timestep;
    const x = state[2 * config.projectile];
    const y = -state[2 * config.projectile + 1];
    const vx = state[2 * numParticles + 2 * config.projectile];
    const vy = state[2 * numParticles + 2 * config.projectile + 1];
    const speed = Math.sqrt(vx * vx + vy * vy);

    console.log(
      `${time.toFixed(1).padStart(7)} | ${x.toFixed(2).padStart(11)} | ${y.toFixed(2).padStart(11)} | ${vx.toFixed(2).padStart(8)} | ${vy.toFixed(2).padStart(8)} | ${speed.toFixed(2).padStart(10)}`
    );
  }

  // Find final position
  const finalState = trajectories[trajectories.length - 1];
  const finalX = finalState[2 * config.projectile];
  const finalY = -finalState[2 * config.projectile + 1];
  const finalVx = finalState[2 * numParticles + 2 * config.projectile];
  const finalVy = finalState[2 * numParticles + 2 * config.projectile + 1];

  console.log("\n2. FINAL STATE");
  console.log("=".repeat(80));
  console.log(`Final X position: ${finalX.toFixed(2)} m = ${(finalX * 3.28084).toFixed(2)} ft`);
  console.log(`Final Y position: ${finalY.toFixed(2)} m`);
  console.log(`Final velocity: (${finalVx.toFixed(2)}, ${finalVy.toFixed(2)}) m/s`);
  console.log(`Simulation stopped at: ${((trajectories.length - 1) * config.timestep).toFixed(2)}s`);

  // Check if simulation hit duration limit
  const hitDurationLimit = (trajectories.length - 1) * config.timestep >= config.duration;

  if (hitDurationLimit) {
    console.log(`⚠️  WARNING: Simulation hit duration limit (${config.duration}s)`);
    console.log(`    Projectile may still be in flight!`);
  }

  // Calculate true ballistic range from release point
  console.log("\n3. BALLISTIC TRAJECTORY ANALYSIS");
  console.log("=".repeat(80));

  // Find release point (when projectile has max speed or starts descending)
  let releaseIdx = 0;
  let maxSpeed = 0;

  for (let i = 0; i < trajectories.length; i++) {
    const state = trajectories[i];
    const vx = state[2 * numParticles + 2 * config.projectile];
    const vy = state[2 * numParticles + 2 * config.projectile + 1];
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > maxSpeed) {
      maxSpeed = speed;
      releaseIdx = i;
    }
  }

  const releaseState = trajectories[releaseIdx];
  const releaseX = releaseState[2 * config.projectile];
  const releaseY = -releaseState[2 * config.projectile + 1];
  const releaseVx = releaseState[2 * numParticles + 2 * config.projectile];
  const releaseVy = releaseState[2 * numParticles + 2 * config.projectile + 1];
  const releaseSpeed = Math.sqrt(releaseVx * releaseVx + releaseVy * releaseVy);
  const releaseAngle = Math.atan2(releaseVy, releaseVx) * 180 / Math.PI;

  console.log(`Release point:`);
  console.log(`  Time: ${(releaseIdx * config.timestep).toFixed(2)}s`);
  console.log(`  Position: (${releaseX.toFixed(2)}, ${releaseY.toFixed(2)}) m`);
  console.log(`  Velocity: (${releaseVx.toFixed(2)}, ${releaseVy.toFixed(2)}) m/s`);
  console.log(`  Speed: ${releaseSpeed.toFixed(2)} m/s`);
  console.log(`  Angle: ${releaseAngle.toFixed(2)}°`);

  // Calculate theoretical ballistic range from release point
  const g = 1; // gravity magnitude in simulation units
  const timeToGround = (releaseVy + Math.sqrt(releaseVy * releaseVy + 2 * g * releaseY)) / g;
  const ballisticRange = releaseX + releaseVx * timeToGround;

  console.log(`\nTheoretical ballistic calculation:`);
  console.log(`  Time to ground: ${timeToGround.toFixed(2)}s`);
  console.log(`  Ballistic range: ${ballisticRange.toFixed(2)} m = ${(ballisticRange * 3.28084).toFixed(2)} ft`);

  // Compare with reported range
  console.log("\n4. RANGE COMPARISON");
  console.log("=".repeat(80));

  const reportedRange = data.constrainedChampion.range;
  console.log(`Reported range: ${reportedRange.toFixed(2)} ft`);
  console.log(`Theoretical ballistic: ${(ballisticRange * 3.28084).toFixed(2)} ft`);
  console.log(`Final X position: ${(finalX * 3.28084).toFixed(2)} ft`);
  console.log(`Discrepancy: ${(reportedRange / (ballisticRange * 3.28084)).toFixed(2)}x`);

  if (Math.abs(reportedRange - ballisticRange * 3.28084) / reportedRange > 0.1) {
    console.log(`\n⚠️  WARNING: Reported range differs significantly from ballistic calculation`);
    console.log(`    This suggests an error in the range calculation method`);
  }

  // Check what calculateRange actually does
  console.log("\n5. INVESTIGATING RANGE CALCULATION");
  console.log("=".repeat(80));

  // Manually check the calculateRange logic
  // Looking for where the projectile crosses Y=0
  let groundCrossingIdx = -1;
  for (let i = 0; i < trajectories.length; i++) {
    const y = -trajectories[i][2 * config.projectile + 1];
    if (y < 0) {
      groundCrossingIdx = i;
      break;
    }
  }

  if (groundCrossingIdx === -1) {
    console.log(`⚠️  Projectile never crossed ground level (Y=0)`);
    console.log(`    All Y values are positive (above ground)`);
    console.log(`    Range calculation may use final X position instead`);
  } else {
    const crossingX = trajectories[groundCrossingIdx][2 * config.projectile];
    console.log(`Ground crossing at:`);
    console.log(`  Index: ${groundCrossingIdx}`);
    console.log(`  Time: ${(groundCrossingIdx * config.timestep).toFixed(2)}s`);
    console.log(`  X: ${crossingX.toFixed(2)} m = ${(crossingX * 3.28084).toFixed(2)} ft`);
  }

  // Check if projectile position is growing exponentially
  console.log("\n6. POSITION GROWTH ANALYSIS");
  console.log("=".repeat(80));

  const xPositions = [];
  for (let i = 0; i < Math.min(trajectories.length, 120); i += 10) {
    const x = trajectories[i][2 * config.projectile];
    xPositions.push({ time: i * config.timestep, x });
  }

  console.log("\nX position growth:");
  for (const { time, x } of xPositions) {
    console.log(`  t=${time.toFixed(1)}s: X=${x.toFixed(2)} m`);
  }

  const x0 = xPositions[0].x;
  const x1 = xPositions[xPositions.length - 1].x;
  const avgVelocity = (x1 - x0) / (xPositions[xPositions.length - 1].time - xPositions[0].time);

  console.log(`\nAverage horizontal velocity: ${avgVelocity.toFixed(2)} m/s`);

  if (avgVelocity > 200) {
    console.log(`⚠️  WARNING: Average velocity exceeds reasonable limits`);
    console.log(`    Projectile is accelerating or moving unrealistically`);
  }

  console.log("\n" + "=".repeat(80));

  expect(trajectories.length).toBeGreaterThan(0);
});
