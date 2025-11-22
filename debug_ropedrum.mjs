#!/usr/bin/env node
/**
 * Debug script to check RopeDrum constraint forces
 */

import { simulate } from './simulate.js';
import { fillEmptyConstraints, presets } from './trebuchetsimulation.js';

const presetName = "Drum Counterweight";
const presetJson = presets[presetName];
const data = JSON.parse(presetJson);
fillEmptyConstraints(data);

function terminate(trajectories) {
  return false;
}

console.log("=== RopeDrum Constraint Debug ===\n");
console.log("Initial positions:");
for (let i = 0; i < data.particles.length; i++) {
  console.log(`  p${i}: (${data.particles[i].x}, ${data.particles[i].y}) mass=${data.particles[i].mass}`);
}

console.log("\nConstraints:");
console.log("  Rods:", data.constraints.rod);
console.log("  RopeDrum:", data.constraints.ropedrum);

const [trajectories, constraintLog, forceLog] = simulate(
  data.particles,
  data.constraints,
  data.timestep,
  data.duration,
  terminate
);

console.log("\n=== Tracking Particle 4 (Counterweight) ===");
for (let i = 0; i < Math.min(10, trajectories.length); i++) {
  const state = trajectories[i];
  const t = i * data.timestep;
  const y4 = state[2 * 4 + 1];
  const vy4 = state[2 * data.particles.length + 2 * 4 + 1];

  console.log(`t=${t.toFixed(1)}s: y=${y4.toFixed(2)}, vy=${vy4.toFixed(2)}`);
}

// Check final position
const finalState = trajectories[trajectories.length - 1];
const finalY4 = finalState[2 * 4 + 1];
console.log(`\nFinal y position of particle 4: ${finalY4.toFixed(2)}`);
console.log(`Started at: 622.00`);
console.log(`Change: ${(finalY4 - 622).toFixed(2)}`);

if (finalY4 > 1000) {
  console.log("\n⚠️  PARTICLE FELL OFF! Constraint is not working.");
}

// Check constraint forces at a few timesteps
console.log("\n=== Constraint Forces (first few timesteps) ===");
for (let i = 0; i < Math.min(5, forceLog.length); i++) {
  if (forceLog[i]) {
    console.log(`t=${(i * data.timestep).toFixed(1)}s: forces =`, forceLog[i]);
  }
}
