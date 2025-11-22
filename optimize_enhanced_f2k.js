import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculatePeakLoad,
  calculateRange,
} from "./trebuchetsimulation.js";

global.window = { data: {} };

function terminate(state, data) {
  const vx = state[2 * data.projectile + 2 * data.particles.length];
  const vy = state[2 * data.projectile + 2 * data.particles.length + 1];
  return vx > 100 && vy > 0;
}

function analyzeDesign(data) {
  fillEmptyConstraints(data);
  global.window.data = data;

  try {
    const [trajectories, constraintLog, forceLog] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      (state) => terminate(state, data)
    );

    const peakLoad = calculatePeakLoad(forceLog);
    const range = calculateRange(trajectories, data);

    if (range > 1e6 || peakLoad > 1e6 || isNaN(range) || isNaN(peakLoad)) {
      return { range: 0, peakLoad: Infinity, success: false };
    }

    return { range, peakLoad, success: true };
  } catch (e) {
    return { range: 0, peakLoad: Infinity, success: false };
  }
}

function randn() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function pullconfig(data) {
  const config = [];
  const projectileIdx = data.projectile;
  const armtipIdx = data.armtip;

  for (let i = 1; i < data.particles.length; i++) {
    const p = data.particles[i];
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

function pushconfig(data, config) {
  let i = 0;
  const projectileIdx = data.projectile;
  const armtipIdx = data.armtip;

  for (let pidx = 1; pidx < data.particles.length; pidx++) {
    const p = data.particles[pidx];
    if (pidx === projectileIdx || pidx === armtipIdx) {
      if (p.x % 10 !== 0) { p.x = config[i]; i++; }
      if (p.y % 10 !== 0) { p.y = config[i]; i++; }
    } else {
      if (p.x % 10 !== 0) { p.x = config[i]; i++; }
      if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
    }
  }
}

async function gentlifyDesign(data, iterations = 600) {
  let step = 1.5;
  let z = pullconfig(data);
  const { range: targetRange } = analyzeDesign(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let noImprovement = 0;

  console.log(`Gentlifying (target range: ${targetRange.toFixed(2)})...`);

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const { range, peakLoad, success } = analyzeDesign(data);
    if (success && range >= targetRange * 0.95) {
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

    if (noImprovement > 40) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

const enhancedF2k = {
  "projectile":3,
  "mainaxle":0,
  "armtip":1,
  "axleheight":8,
  "timestep":0.5,
  "duration":35,
  "particles":[
    {"x":470,"y":520,"mass":1},
    {"x":442.0275826601856,"y":467.8932598102307,"mass":2},
    {"x":617.5106590887013,"y":231.96171263886725,"mass":203.78892294787303},
    {"x":615.3043666315127,"y":495.58144617498107,"mass":1}
  ],
  "constraints":{
    "rod":[{"p1":1,"p2":3},{"p1":1,"p2":2}],
    "slider":[
      {"p":2,"normal":{"x":0.7,"y":0.2}},
      {"p":3,"normal":{"x":0,"y":1},"oneway":true}
    ],
    "f2k":[{"reference":1,"slider":0,"base":2}],
    "pin":[{"p":0}]
  }
};

console.log("=".repeat(80));
console.log("OPTIMIZING ENHANCED F2K");
console.log("=".repeat(80));
console.log();

let result = analyzeDesign(enhancedF2k);
console.log("Initial state:");
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);
console.log();

result = await gentlifyDesign(enhancedF2k, 600);
console.log(`\nAfter gentlification:`);
console.log(`  Range:      ${result.range.toFixed(2)} units`);
console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);

console.log("\n" + "=".repeat(80));
console.log("FINAL ENHANCED F2K CONFIGURATION:");
console.log("=".repeat(80));
console.log(JSON.stringify(enhancedF2k));
