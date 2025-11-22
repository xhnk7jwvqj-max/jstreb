import { presets, fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

console.log("Analyzing all trebuchet presets...\n");
console.log("=" .repeat(80));

const results = [];

// Iterate through all presets
for (const [name, jsonString] of Object.entries(presets)) {
  try {
    const data = JSON.parse(jsonString);
    fillEmptyConstraints(data);

    // Run simulation
    const terminate = (state) => {
      // Check if projectile has been released
      const n = data.particles.length;
      const projectileIdx = data.projectile;
      const armtipIdx = data.armtip;

      // Get positions
      const projX = state[2 * projectileIdx];
      const projY = state[2 * projectileIdx + 1];
      const tipX = state[2 * armtipIdx];
      const tipY = state[2 * armtipIdx + 1];

      // Check if released (distance > initial sling length * 1.5)
      const dist = Math.sqrt((projX - tipX) ** 2 + (projY - tipY) ** 2);

      // Get initial distance
      const initialDist = Math.sqrt(
        (data.particles[projectileIdx].x - data.particles[armtipIdx].x) ** 2 +
        (data.particles[projectileIdx].y - data.particles[armtipIdx].y) ** 2
      );

      return dist > initialDist * 1.5;
    };

    const [trajectories, constraintLog, forceLog] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );

    // Calculate metrics
    const range = calculateRange(trajectories, data);
    const peakLoad = calculatePeakLoad(forceLog);

    results.push({
      name,
      range: range.toFixed(1),
      peakLoad: peakLoad.toFixed(1),
      rangeNum: range,
      peakLoadNum: peakLoad,
      particles: data.particles.length,
      projectileMass: data.particles[data.projectile].mass,
      armtipMass: data.particles[data.armtip].mass
    });

    console.log(`\n${name}`);
    console.log("-".repeat(80));
    console.log(`  Range: ${range.toFixed(1)} ft`);
    console.log(`  Peak Load: ${peakLoad.toFixed(1)} lbf`);
    console.log(`  Particles: ${data.particles.length}`);
    console.log(`  Projectile Mass: ${data.particles[data.projectile].mass}`);
    console.log(`  Arm Tip Mass: ${data.particles[data.armtip].mass}`);

  } catch (error) {
    console.log(`\n${name}: ERROR - ${error.message}`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("\nSUMMARY (sorted by range):\n");

// Sort by range
results.sort((a, b) => b.rangeNum - a.rangeNum);

console.log("Preset".padEnd(30) + "Range (ft)".padEnd(15) + "Peak Load (lbf)".padEnd(20) + "Particles");
console.log("-".repeat(80));

for (const result of results) {
  console.log(
    result.name.padEnd(30) +
    result.range.padEnd(15) +
    result.peakLoad.padEnd(20) +
    result.particles
  );
}

console.log("\n" + "=".repeat(80));
console.log("\nTOP PERFORMERS:\n");
console.log(`Longest Range: ${results[0].name} (${results[0].range} ft)`);
console.log(`Lowest Peak Load: ${results.reduce((min, r) => r.peakLoadNum < min.peakLoadNum ? r : min).name} (${results.reduce((min, r) => r.peakLoadNum < min.peakLoadNum ? r : min).peakLoad} lbf)`);

const efficiency = results.map(r => ({
  ...r,
  efficiency: r.rangeNum / r.peakLoadNum
})).sort((a, b) => b.efficiency - a.efficiency);

console.log(`Best Efficiency (range/load): ${efficiency[0].name} (${(efficiency[0].efficiency).toFixed(3)} ft/lbf)`);
