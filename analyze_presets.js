import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculatePeakLoad,
  calculateRange,
  presets,
} from "./trebuchetsimulation.js";

// Create a mock window object for Node.js environment
global.window = {
  data: {}
};

// Termination function for simulation
function terminate(state, data) {
  const slingx = state[2 * data.armtip] - state[2 * data.projectile];
  const slingy = state[2 * data.armtip + 1] - state[2 * data.projectile + 1];
  const norms = Math.sqrt(slingx * slingx + slingy * slingy);

  const armx = state[2 * data.armtip] - state[2 * data.mainaxle];
  const army = state[2 * data.armtip + 1] - state[2 * data.mainaxle + 1];

  const vx = state[2 * data.projectile + 2 * data.particles.length];
  const vy = state[2 * data.projectile + 2 * data.particles.length + 1];
  return vx > 100 && vy > 0;
}

// Simulate a preset and get its range and peak load
function analyzePreset(presetData) {
  fillEmptyConstraints(presetData);

  // Set the global window.data for the simulate function
  global.window.data = presetData;

  const [trajectories, constraintLog, forceLog] = simulate(
    presetData.particles,
    presetData.constraints,
    presetData.timestep,
    presetData.duration,
    (state) => terminate(state, presetData)
  );

  const peakLoad = calculatePeakLoad(forceLog);
  const range = calculateRange(trajectories, presetData);

  return { range, peakLoad };
}

console.log("=".repeat(80));
console.log("PRESET ANALYSIS REPORT");
console.log("=".repeat(80));
console.log();

const results = [];

for (const [name, presetJson] of Object.entries(presets)) {
  const data = JSON.parse(presetJson);
  const { range, peakLoad } = analyzePreset(data);

  results.push({ name, range, peakLoad });

  console.log(`Preset: ${name}`);
  console.log(`  Range:      ${range.toFixed(2)} units`);
  console.log(`  Peak Load:  ${peakLoad.toFixed(2)} N`);
  console.log(`  Efficiency: ${(range / peakLoad).toFixed(4)} (range/load)`);
  console.log();
}

console.log("=".repeat(80));
console.log("SUMMARY STATISTICS");
console.log("=".repeat(80));
console.log();

// Sort by range
const byRange = [...results].sort((a, b) => b.range - a.range);
console.log("Top 3 by Range:");
byRange.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name}: ${r.range.toFixed(2)} units`);
});
console.log();

// Sort by peak load (lower is better)
const byLoad = [...results].sort((a, b) => a.peakLoad - b.peakLoad);
console.log("Top 3 by Lowest Peak Load:");
byLoad.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name}: ${r.peakLoad.toFixed(2)} N`);
});
console.log();

// Sort by efficiency
const byEfficiency = [...results].sort((a, b) => (b.range / b.peakLoad) - (a.range / a.peakLoad));
console.log("Top 3 by Efficiency (Range/Load):");
byEfficiency.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name}: ${(r.range / r.peakLoad).toFixed(4)}`);
});
console.log();
