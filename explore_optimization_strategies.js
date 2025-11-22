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

// Strategy 1: Random Search with adaptive step size
function randomSearchAdaptive(data, iterations, objectiveFn) {
  function pullconfig(data) {
    const config = [];
    for (let i = 1; i < data.particles.length; i++) {
      const p = data.particles[i];
      if (i === data.projectile || i === data.armtip) {
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
    for (let pidx = 1; pidx < data.particles.length; pidx++) {
      const p = data.particles[pidx];
      if (pidx === data.projectile || pidx === data.armtip) {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      } else {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
        if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
      }
    }
  }

  let step = 8.0;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let noImprovement = 0;

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const result = analyzeDesign(data);
    if (result.success) {
      const score = objectiveFn(result);
      if (score > bestScore) {
        bestScore = score;
        bestConfig = [...newz];
        z = [...newz];
        noImprovement = 0;
      } else {
        noImprovement++;
      }
    }

    if (noImprovement > 30) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return { result: analyzeDesign(data), score: bestScore };
}

// Strategy 2: Simulated Annealing
function simulatedAnnealing(data, iterations, objectiveFn) {
  function pullconfig(data) {
    const config = [];
    for (let i = 1; i < data.particles.length; i++) {
      const p = data.particles[i];
      if (i === data.projectile || i === data.armtip) {
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
    for (let pidx = 1; pidx < data.particles.length; pidx++) {
      const p = data.particles[pidx];
      if (pidx === data.projectile || pidx === data.armtip) {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      } else {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
        if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
      }
    }
  }

  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let currentScore = -Infinity;

  const result = analyzeDesign(data);
  if (result.success) {
    currentScore = objectiveFn(result);
    bestScore = currentScore;
  }

  for (let i = 0; i < iterations; i++) {
    const temperature = 10.0 * Math.pow(0.995, i); // Exponential cooling
    const step = 8.0 * Math.pow(0.98, i);

    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const result = analyzeDesign(data);
    if (result.success) {
      const newScore = objectiveFn(result);
      const delta = newScore - currentScore;

      // Accept if better, or with probability based on temperature
      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        z = [...newz];
        currentScore = newScore;

        if (newScore > bestScore) {
          bestScore = newScore;
          bestConfig = [...newz];
        }
      }
    }
  }

  pushconfig(data, bestConfig);
  return { result: analyzeDesign(data), score: bestScore };
}

// Strategy 3: Coordinate Descent (optimize one parameter at a time)
function coordinateDescent(data, iterations, objectiveFn) {
  function pullconfig(data) {
    const config = [];
    for (let i = 1; i < data.particles.length; i++) {
      const p = data.particles[i];
      if (i === data.projectile || i === data.armtip) {
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
    for (let pidx = 1; pidx < data.particles.length; pidx++) {
      const p = data.particles[pidx];
      if (pidx === data.projectile || pidx === data.armtip) {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      } else {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
        if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
      }
    }
  }

  let z = pullconfig(data);
  let bestScore = -Infinity;

  const result = analyzeDesign(data);
  if (result.success) {
    bestScore = objectiveFn(result);
  }

  const iterationsPerCoord = Math.floor(iterations / z.length);

  for (let coord = 0; coord < z.length; coord++) {
    for (let iter = 0; iter < iterationsPerCoord; iter++) {
      const step = 5.0 * Math.pow(0.95, iter);
      const oldVal = z[coord];
      z[coord] = oldVal + randn() * step;

      pushconfig(data, z);
      const result = analyzeDesign(data);

      if (result.success) {
        const newScore = objectiveFn(result);
        if (newScore > bestScore) {
          bestScore = newScore;
        } else {
          z[coord] = oldVal; // Revert
        }
      } else {
        z[coord] = oldVal;
      }
    }
  }

  pushconfig(data, z);
  return { result: analyzeDesign(data), score: bestScore };
}

// Strategy 4: Population-based (simple genetic algorithm)
function populationBased(data, iterations, objectiveFn) {
  function pullconfig(data) {
    const config = [];
    for (let i = 1; i < data.particles.length; i++) {
      const p = data.particles[i];
      if (i === data.projectile || i === data.armtip) {
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
    for (let pidx = 1; pidx < data.particles.length; pidx++) {
      const p = data.particles[pidx];
      if (pidx === data.projectile || pidx === data.armtip) {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
      } else {
        if (p.x % 10 !== 0) { p.x = config[i]; i++; }
        if (p.y % 10 !== 0) { p.y = config[i]; i++; }
        if (p.mass % 1 !== 0) { p.mass = Math.abs(config[i]); i++; }
      }
    }
  }

  const z = pullconfig(data);
  const popSize = 10;
  const population = [];

  // Initialize population
  for (let i = 0; i < popSize; i++) {
    const individual = z.map((v) => v + randn() * 10.0);
    pushconfig(data, individual);
    const result = analyzeDesign(data);
    const score = result.success ? objectiveFn(result) : -Infinity;
    population.push({ config: individual, score });
  }

  const generationSize = Math.floor(iterations / popSize);

  for (let gen = 0; gen < generationSize; gen++) {
    // Sort by score
    population.sort((a, b) => b.score - a.score);

    // Keep top 50%
    const survivors = population.slice(0, Math.floor(popSize / 2));

    // Create offspring
    const offspring = [];
    while (offspring.length < popSize - survivors.length) {
      const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
      const parent2 = survivors[Math.floor(Math.random() * survivors.length)];

      // Crossover + mutation
      const child = parent1.config.map((v, i) => {
        const val = Math.random() < 0.5 ? v : parent2.config[i];
        return val + randn() * 2.0 * Math.pow(0.95, gen);
      });

      pushconfig(data, child);
      const result = analyzeDesign(data);
      const score = result.success ? objectiveFn(result) : -Infinity;
      offspring.push({ config: child, score });
    }

    population.length = 0;
    population.push(...survivors, ...offspring);
  }

  population.sort((a, b) => b.score - a.score);
  pushconfig(data, population[0].config);
  return { result: analyzeDesign(data), score: population[0].score };
}

console.log("=".repeat(80));
console.log("EXPLORING OPTIMIZATION STRATEGIES ON ORBITAL SLING");
console.log("=".repeat(80));
console.log();

// Base Orbital Sling design
const orbitalSling = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.35,
  "duration": 40,
  "particles": [
    {"x": 500, "y": 500, "mass": 1},
    {"x": 440.5, "y": 510.3, "mass": 2},
    {"x": 550.7, "y": 400.1, "mass": 150.5},
    {"x": 650.2, "y": 525.5, "mass": 1}
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},
      {"p1": 0, "p2": 2},
      {"p1": 1, "p2": 3}
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "colinear": [
      {"reference": 0, "slider": 2, "base": 1}
    ]
  }
};

// Test different objective functions
const objectives = {
  "Maximize Range": (result) => result.range,
  "Maximize Efficiency": (result) => result.range / result.peakLoad,
  "Minimize Load (range > 1000)": (result) => result.range > 1000 ? -result.peakLoad : -1e9,
  "Multi-objective (range^2 / load)": (result) => (result.range * result.range) / result.peakLoad,
};

const strategies = {
  "Random Search": randomSearchAdaptive,
  "Simulated Annealing": simulatedAnnealing,
  "Coordinate Descent": coordinateDescent,
  "Population-Based": populationBased,
};

const results = [];

for (const [objName, objectiveFn] of Object.entries(objectives)) {
  console.log("\n" + "=".repeat(80));
  console.log(`OBJECTIVE: ${objName}`);
  console.log("=".repeat(80));

  for (const [stratName, strategyFn] of Object.entries(strategies)) {
    // Deep copy the design
    const testDesign = JSON.parse(JSON.stringify(orbitalSling));

    console.log(`\n  Testing: ${stratName}`);
    const startTime = Date.now();
    const { result, score } = strategyFn(testDesign, 300, objectiveFn);
    const endTime = Date.now();

    if (result.success) {
      console.log(`    Range: ${result.range.toFixed(2)}`);
      console.log(`    Load:  ${result.peakLoad.toFixed(2)}`);
      console.log(`    Efficiency: ${(result.range / result.peakLoad).toFixed(4)}`);
      console.log(`    Time: ${((endTime - startTime) / 1000).toFixed(1)}s`);

      results.push({
        objective: objName,
        strategy: stratName,
        range: result.range,
        peakLoad: result.peakLoad,
        efficiency: result.range / result.peakLoad,
        time: (endTime - startTime) / 1000,
        config: JSON.stringify(testDesign)
      });
    } else {
      console.log(`    ❌ Failed to find valid solution`);
    }
  }
}

console.log("\n" + "=".repeat(80));
console.log("COMPARATIVE ANALYSIS");
console.log("=".repeat(80));

// Best by range
const byRange = [...results].sort((a, b) => b.range - a.range);
console.log("\n🏆 Best Range:");
console.log(`  ${byRange[0].strategy} + ${byRange[0].objective}`);
console.log(`  Range: ${byRange[0].range.toFixed(2)} units`);

// Best by efficiency
const byEfficiency = [...results].sort((a, b) => b.efficiency - a.efficiency);
console.log("\n⚡ Best Efficiency:");
console.log(`  ${byEfficiency[0].strategy} + ${byEfficiency[0].objective}`);
console.log(`  Efficiency: ${byEfficiency[0].efficiency.toFixed(4)}`);
console.log(`  Range: ${byEfficiency[0].range.toFixed(2)} units`);

// Best by load
const byLoad = [...results].sort((a, b) => a.peakLoad - b.peakLoad);
console.log("\n🪶 Lowest Peak Load:");
console.log(`  ${byLoad[0].strategy} + ${byLoad[0].objective}`);
console.log(`  Load: ${byLoad[0].peakLoad.toFixed(2)} N`);
console.log(`  Range: ${byLoad[0].range.toFixed(2)} units`);

// Fastest
const byTime = [...results].sort((a, b) => a.time - b.time);
console.log("\n⏱️  Fastest:");
console.log(`  ${byTime[0].strategy} (${byTime[0].time.toFixed(1)}s)`);

console.log("\n" + "=".repeat(80));
console.log("STRATEGY COMPARISON (Average Performance)");
console.log("=".repeat(80));

for (const stratName of Object.keys(strategies)) {
  const stratResults = results.filter(r => r.strategy === stratName);
  const avgRange = stratResults.reduce((s, r) => s + r.range, 0) / stratResults.length;
  const avgEfficiency = stratResults.reduce((s, r) => s + r.efficiency, 0) / stratResults.length;
  const avgTime = stratResults.reduce((s, r) => s + r.time, 0) / stratResults.length;

  console.log(`\n${stratName}:`);
  console.log(`  Avg Range: ${avgRange.toFixed(2)}`);
  console.log(`  Avg Efficiency: ${avgEfficiency.toFixed(4)}`);
  console.log(`  Avg Time: ${avgTime.toFixed(1)}s`);
}

console.log("\n" + "=".repeat(80));
console.log("BEST OVERALL ORBITAL SLING:");
console.log("=".repeat(80));
console.log(`Strategy: ${byRange[0].strategy}`);
console.log(`Objective: ${byRange[0].objective}`);
console.log(`Range: ${byRange[0].range.toFixed(2)} units`);
console.log(`Peak Load: ${byRange[0].peakLoad.toFixed(2)} N`);
console.log(`Efficiency: ${byRange[0].efficiency.toFixed(4)}`);
console.log("\nConfiguration:");
console.log(byRange[0].config);
