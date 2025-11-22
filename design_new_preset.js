import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculatePeakLoad,
  calculateRange,
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

// Pull configuration from design
function pullconfig(data) {
  const config = [];
  for (const p of data.particles.slice(1)) {
    if (p.x % 10 !== 0) config.push(p.x);
    if (p.y % 10 !== 0) config.push(p.y);
    if (p.mass % 1 !== 0) config.push(p.mass);
  }
  return config;
}

// Push configuration to design
function pushconfig(data, config) {
  let i = 0;
  for (const p of data.particles.slice(1)) {
    if (p.x % 10 !== 0) { p.x = config[i]; i++; }
    if (p.y % 10 !== 0) { p.y = config[i]; i++; }
    if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
  }
}

// Optimize for range
async function optimizeForRange(data, iterations = 200) {
  let step = 5.0;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];

  console.log("Optimizing for range...");

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    try {
      const { range } = analyzeDesign(data);

      if (range > bestScore) {
        bestScore = range;
        bestConfig = [...newz];
        z = [...newz];
        console.log(`  Iteration ${i}: Range = ${range.toFixed(2)}`);
      }
    } catch (e) {
      // Invalid configuration, skip
    }

    if (i % 50 === 49) {
      step *= 0.7; // Reduce step size
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// Gentlify - reduce peak load while maintaining range
async function gentlifyDesign(data, iterations = 200) {
  let step = 0.6;
  let z = pullconfig(data);
  const { range: targetRange } = analyzeDesign(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];

  console.log(`\nGentlifying (target range: ${targetRange.toFixed(2)})...`);

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    try {
      const { range, peakLoad } = analyzeDesign(data);

      if (range >= targetRange * 0.98) { // Allow 2% range loss
        const score = -peakLoad;
        if (score > bestScore) {
          bestScore = score;
          bestConfig = [...newz];
          z = [...newz];
          console.log(`  Iteration ${i}: Load = ${peakLoad.toFixed(2)}, Range = ${range.toFixed(2)}`);
        }
      }
    } catch (e) {
      // Invalid configuration, skip
    }

    if (i % 50 === 49) {
      step *= 0.7;
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// Create a new hybrid design
// Inspired by F2k (efficiency) + Whipper (multi-stage)
const newDesign = {
  "projectile": 4,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.35,
  "duration": 40,
  "particles": [
    {"x": 490, "y": 520, "mass": 1},        // P1: Main axle (slider)
    {"x": 441.5, "y": 515.3, "mass": 4.2},  // P2: Arm tip (optimizable)
    {"x": 503.7, "y": 458.1, "mass": 12.5}, // P3: Inner arm joint (optimizable)
    {"x": 571.3, "y": 261.8, "mass": 85.7}, // P4: Counterweight (optimizable)
    {"x": 661.2, "y": 627.5, "mass": 1},    // P5: Projectile (optimizable)
    {"x": 555.8, "y": 387.4, "mass": 15.3}  // P6: Secondary mass (optimizable)
  ],
  "constraints": {
    "rod": [
      {"p1": 1, "p2": 4},  // Sling
      {"p1": 1, "p2": 2},  // Primary arm
      {"p1": 2, "p2": 3},  // Secondary arm segment
      {"p1": 3, "p2": 5},  // Connection to secondary mass
      {"p1": 2, "p2": 5}   // Reinforcement
    ],
    "slider": [
      {"p": 0, "normal": {"x": 1, "y": 1}},      // Diagonal slide
      {"p": 3, "normal": {"x": 0.65, "y": 0}},   // Horizontal slide for counterweight
      {"p": 4, "normal": {"x": 0, "y": 1}, "oneway": true}  // One-way for projectile
    ],
    "f2k": [
      {"reference": 1, "slider": 0, "base": 3}  // F2k mechanism for efficiency
    ]
  }
};

console.log("=".repeat(80));
console.log("DESIGNING NEW TREBUCHET PRESET: 'Hybrid Optimizer'");
console.log("=".repeat(80));
console.log();

console.log("Initial design analysis:");
let result = analyzeDesign(newDesign);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);
console.log();

// Optimize for range
result = await optimizeForRange(newDesign, 150);
console.log(`\nAfter range optimization:`);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);

// Gentlify
result = await gentlifyDesign(newDesign, 150);
console.log(`\nAfter gentlification:`);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);
console.log();

console.log("=".repeat(80));
console.log("FINAL DESIGN:");
console.log("=".repeat(80));
console.log(JSON.stringify(newDesign));
console.log();
