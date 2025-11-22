import { presets, fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

console.log("Testing FAT Pulley Hybrid...\n");

const design = JSON.parse(presets["FAT Pulley Hybrid"]);
console.log("Design:", JSON.stringify(design, null, 2));

fillEmptyConstraints(design);

console.log("\nAfter fillEmptyConstraints:");
console.log(JSON.stringify(design, null, 2));

try {
  const terminate = (state) => {
    const projectileIdx = design.projectile;
    const armtipIdx = design.armtip;
    const projX = state[2 * projectileIdx];
    const projY = state[2 * projectileIdx + 1];
    const tipX = state[2 * armtipIdx];
    const tipY = state[2 * armtipIdx + 1];
    const dist = Math.sqrt((projX - tipX) ** 2 + (projY - tipY) ** 2);
    const initialDist = Math.sqrt(
      (design.particles[projectileIdx].x - design.particles[armtipIdx].x) ** 2 +
      (design.particles[projectileIdx].y - design.particles[armtipIdx].y) ** 2
    );
    return dist > initialDist * 1.5;
  };

  const [trajectories, constraintLog, forceLog] = simulate(
    design.particles,
    design.constraints,
    design.timestep,
    design.duration,
    terminate
  );

  const range = calculateRange(trajectories, design);
  const peakLoad = calculatePeakLoad(forceLog);

  console.log(`\nRange: ${range.toFixed(1)} ft`);
  console.log(`Peak Load: ${peakLoad.toFixed(1)} lbf`);
} catch (e) {
  console.log(`\nERROR: ${e.message}`);
  console.log(e.stack);
}
