import { presets, fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

console.log("Testing Sky Render evaluation...\n");

// Load from presets
const skyRenderFromPresets = JSON.parse(presets["Sky Render"]);
fillEmptyConstraints(skyRenderFromPresets);

console.log("Sky Render from presets:");
console.log(JSON.stringify(skyRenderFromPresets, null, 2));

const terminate = (state) => {
  const projectileIdx = skyRenderFromPresets.projectile;
  const armtipIdx = skyRenderFromPresets.armtip;
  const projX = state[2 * projectileIdx];
  const projY = state[2 * projectileIdx + 1];
  const tipX = state[2 * armtipIdx];
  const tipY = state[2 * armtipIdx + 1];
  const dist = Math.sqrt((projX - tipX) ** 2 + (projY - tipY) ** 2);
  const initialDist = Math.sqrt(
    (skyRenderFromPresets.particles[projectileIdx].x - skyRenderFromPresets.particles[armtipIdx].x) ** 2 +
    (skyRenderFromPresets.particles[projectileIdx].y - skyRenderFromPresets.particles[armtipIdx].y) ** 2
  );
  return dist > initialDist * 1.5;
};

const [trajectories, constraintLog, forceLog] = simulate(
  skyRenderFromPresets.particles,
  skyRenderFromPresets.constraints,
  skyRenderFromPresets.timestep,
  skyRenderFromPresets.duration,
  terminate
);

const range = calculateRange(trajectories, skyRenderFromPresets);
const peakLoad = calculatePeakLoad(forceLog);

console.log(`\nRange: ${range.toFixed(1)} ft`);
console.log(`Peak Load: ${peakLoad.toFixed(1)} lbf`);
console.log(`Efficiency: ${(range / peakLoad).toFixed(3)} ft/lbf`);
