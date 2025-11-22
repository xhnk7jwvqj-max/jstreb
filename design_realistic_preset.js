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

// Termination function
function terminate(state, data) {
  const vx = state[2 * data.projectile + 2 * data.particles.length];
  const vy = state[2 * data.projectile + 2 * data.particles.length + 1];
  return vx > 100 && vy > 0;
}

// Simulate and analyze
function analyzeDesign(data) {
  fillEmptyConstraints(data);
  global.window.data = data;

  const [trajectories, constraintLog, forceLog] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    (state) => terminate(state, data)
  );

  const peakLoad = calculatePeakLoad(forceLog);
  const range = calculateRange(trajectories, data);

  return { range, peakLoad, trajectories };
}

// Random normal distribution
function randn() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Pull configuration from design (respecting fixed masses)
function pullconfig(data) {
  const config = [];
  const projectileIdx = data.projectile;
  const armtipIdx = data.armtip;

  for (let i = 1; i < data.particles.length; i++) {
    const p = data.particles[i];
    // Skip projectile and armtip - their masses are fixed
    if (i === projectileIdx || i === armtipIdx) {
      if (p.x % 10 !== 0) config.push(p.x);
      if (p.y % 10 !== 0) config.push(p.y);
    } else {
      if (p.x % 10 !== 0) config.push(p.x);
      if (p.y % 10 !== 0) config.push(p.y);
      if (p.mass % 1 !== 0) config.push(p.mass);
    }
  }
  return config;
}

// Push configuration to design (respecting fixed masses)
function pushconfig(data, config) {
  let i = 0;
  const projectileIdx = data.projectile;
  const armtipIdx = data.armtip;

  for (let pidx = 1; pidx < data.particles.length; pidx++) {
    const p = data.particles[pidx];
    if (pidx === projectileIdx || pidx === armtipIdx) {
      if (p.x % 10 !== 0) { p.x = config[i]; i++; }
      if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      // Don't modify mass for projectile and armtip
    } else {
      if (p.x % 10 !== 0) { p.x = config[i]; i++; }
      if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
    }
  }
}

// Optimize for range
async function optimizeForRange(data, iterations = 500) {
  let step = 8.0;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let noImprovement = 0;

  console.log("Optimizing for range (with proper mass constraints)...");

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    try {
      const { range } = analyzeDesign(data);

      if (range > bestScore) {
        bestScore = range;
        bestConfig = [...newz];
        z = [...newz];
        noImprovement = 0;
        console.log(`  Iteration ${i}: Range = ${range.toFixed(2)}`);
      } else {
        noImprovement++;
      }
    } catch (e) {
      // Invalid configuration, skip
    }

    if (noImprovement > 40) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// Gentlify - reduce peak load while maintaining range
async function gentlifyDesign(data, iterations = 500) {
  let step = 1.5;
  let z = pullconfig(data);
  const { range: targetRange } = analyzeDesign(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let noImprovement = 0;

  console.log(`\nGentlifying (target range: ${targetRange.toFixed(2)})...`);

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    try {
      const { range, peakLoad } = analyzeDesign(data);

      if (range >= targetRange * 0.95) { // Allow 5% range loss
        const score = -peakLoad;
        if (score > bestScore) {
          bestScore = score;
          bestConfig = [...newz];
          z = [...newz];
          noImprovement = 0;
          console.log(`  Iteration ${i}: Load = ${peakLoad.toFixed(2)}, Range = ${range.toFixed(2)}`);
        } else {
          noImprovement++;
        }
      }
    } catch (e) {
      // Invalid configuration, skip
    }

    if (noImprovement > 40) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// Start with F2k but enforce proper constraints
const f2kData = JSON.parse(presets.F2k);

// Enforce constraints
f2kData.particles[f2kData.projectile].mass = 1;  // Projectile must be 1
f2kData.particles[f2kData.armtip].mass = 2;      // Arm tip = 2 (light construction)

// Make other coordinates and masses optimizable
for (let i = 1; i < f2kData.particles.length; i++) {
  if (i !== f2kData.projectile && i !== f2kData.armtip) {
    f2kData.particles[i].x += 0.1 * Math.random();
    f2kData.particles[i].y += 0.1 * Math.random();
    f2kData.particles[i].mass += 0.1 * Math.random();
  } else {
    // Projectile and armtip can have optimizable positions
    f2kData.particles[i].x += 0.1 * Math.random();
    f2kData.particles[i].y += 0.1 * Math.random();
  }
}

console.log("=".repeat(80));
console.log("DESIGNING REALISTIC SUPER F2K");
console.log("Constraints: Projectile mass = 1, Arm tip mass = 2");
console.log("=".repeat(80));
console.log();

console.log("Initial constrained F2k design:");
let result = analyzeDesign(f2kData);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);
console.log();

// Optimize for range
result = await optimizeForRange(f2kData, 600);
console.log(`\nAfter range optimization:`);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);

// Gentlify
result = await gentlifyDesign(f2kData, 600);
console.log(`\nAfter gentlification:`);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);
console.log();

// Verify constraints
console.log("Constraint verification:");
console.log(`  Projectile mass: ${f2kData.particles[f2kData.projectile].mass}`);
console.log(`  Arm tip mass: ${f2kData.particles[f2kData.armtip].mass}`);
console.log();

console.log("=".repeat(80));
console.log("FINAL REALISTIC DESIGN:");
console.log("=".repeat(80));
console.log(JSON.stringify(f2kData));
console.log();
