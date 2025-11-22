import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculatePeakLoad,
  calculateRange,
} from "./trebuchetsimulation.js";
import { sampleGaussian, calculateMean, calculateCovariance, choleskyDecomposition } from "./gaussian.js";

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

// Strategy 1: CMA-ES inspired (Covariance Matrix Adaptation)
function cmaES(data, iterations) {
  let z = pullconfig(data);
  const popSize = 20;
  const elite = Math.floor(popSize / 2);

  let bestScore = -Infinity;
  let bestConfig = [...z];
  let step = 5.0;

  for (let gen = 0; gen < Math.floor(iterations / popSize); gen++) {
    const population = [];

    // Generate population
    for (let i = 0; i < popSize; i++) {
      const individual = z.map(v => v + randn() * step);
      pushconfig(data, individual);
      const result = analyzeDesign(data);
      const score = result.success ? result.range : -Infinity;
      population.push({ config: individual, score, result });
    }

    // Sort by fitness
    population.sort((a, b) => b.score - a.score);

    // Update best
    if (population[0].score > bestScore) {
      bestScore = population[0].score;
      bestConfig = [...population[0].config];
    }

    // Calculate new mean from elite
    const eliteConfigs = population.slice(0, elite).map(p => p.config);
    const mean = calculateMean(eliteConfigs);

    // Update center and adapt step size
    z = mean;
    step *= 0.95;
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// Strategy 2: Multi-start local search
function multiStartLocalSearch(data, iterations) {
  const numStarts = 5;
  const iterPerStart = Math.floor(iterations / numStarts);

  let bestOverall = -Infinity;
  let bestConfig = null;

  for (let start = 0; start < numStarts; start++) {
    // Random starting point
    let z = pullconfig(data).map(v => v + randn() * 20.0);
    let step = 8.0;
    let bestLocal = -Infinity;
    let noImprovement = 0;

    for (let i = 0; i < iterPerStart; i++) {
      const newz = z.map(v => v + randn() * step);
      pushconfig(data, newz);
      const result = analyzeDesign(data);

      if (result.success && result.range > bestLocal) {
        bestLocal = result.range;
        z = [...newz];
        noImprovement = 0;
      } else {
        noImprovement++;
      }

      if (noImprovement > 20) {
        step *= 0.7;
        noImprovement = 0;
      }
    }

    if (bestLocal > bestOverall) {
      bestOverall = bestLocal;
      bestConfig = [...z];
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// Strategy 3: Differential Evolution
function differentialEvolution(data, iterations) {
  let z = pullconfig(data);
  const popSize = 15;
  const F = 0.8;  // Mutation factor
  const CR = 0.9; // Crossover rate

  // Initialize population
  const population = [];
  for (let i = 0; i < popSize; i++) {
    const individual = z.map(v => v + randn() * 10.0);
    pushconfig(data, individual);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;
    population.push({ config: individual, score });
  }

  for (let gen = 0; gen < Math.floor(iterations / popSize); gen++) {
    for (let i = 0; i < popSize; i++) {
      // Select three random different individuals
      let a, b, c;
      do { a = Math.floor(Math.random() * popSize); } while (a === i);
      do { b = Math.floor(Math.random() * popSize); } while (b === i || b === a);
      do { c = Math.floor(Math.random() * popSize); } while (c === i || c === a || c === b);

      // Mutation: v = a + F * (b - c)
      const mutant = population[a].config.map((val, idx) =>
        val + F * (population[b].config[idx] - population[c].config[idx])
      );

      // Crossover
      const trial = population[i].config.map((val, idx) =>
        Math.random() < CR ? mutant[idx] : val
      );

      // Selection
      pushconfig(data, trial);
      const result = analyzeDesign(data);
      const score = result.success ? result.range : -Infinity;

      if (score > population[i].score) {
        population[i] = { config: trial, score };
      }
    }
  }

  // Return best
  population.sort((a, b) => b.score - a.score);
  pushconfig(data, population[0].config);
  return analyzeDesign(data);
}

// Strategy 4: Particle Swarm Optimization
function particleSwarm(data, iterations) {
  let z = pullconfig(data);
  const swarmSize = 15;
  const w = 0.7;  // Inertia
  const c1 = 1.5; // Cognitive component
  const c2 = 1.5; // Social component

  // Initialize swarm
  const swarm = [];
  let globalBest = null;
  let globalBestScore = -Infinity;

  for (let i = 0; i < swarmSize; i++) {
    const position = z.map(v => v + randn() * 10.0);
    const velocity = z.map(() => randn() * 2.0);

    pushconfig(data, position);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;

    const particle = {
      position: position,
      velocity: velocity,
      bestPosition: [...position],
      bestScore: score
    };

    if (score > globalBestScore) {
      globalBestScore = score;
      globalBest = [...position];
    }

    swarm.push(particle);
  }

  for (let iter = 0; iter < Math.floor(iterations / swarmSize); iter++) {
    for (let particle of swarm) {
      // Update velocity and position
      particle.velocity = particle.velocity.map((v, idx) => {
        const r1 = Math.random();
        const r2 = Math.random();
        return w * v +
               c1 * r1 * (particle.bestPosition[idx] - particle.position[idx]) +
               c2 * r2 * (globalBest[idx] - particle.position[idx]);
      });

      particle.position = particle.position.map((p, idx) => p + particle.velocity[idx]);

      // Evaluate
      pushconfig(data, particle.position);
      const result = analyzeDesign(data);
      const score = result.success ? result.range : -Infinity;

      // Update personal best
      if (score > particle.bestScore) {
        particle.bestScore = score;
        particle.bestPosition = [...particle.position];
      }

      // Update global best
      if (score > globalBestScore) {
        globalBestScore = score;
        globalBest = [...particle.position];
      }
    }
  }

  pushconfig(data, globalBest);
  return analyzeDesign(data);
}

// Strategy 5: Bayesian-inspired (simple version using historical data)
function bayesianOptimization(data, iterations) {
  let z = pullconfig(data);
  const history = [];
  let bestScore = -Infinity;
  let bestConfig = [...z];

  for (let i = 0; i < iterations; i++) {
    let candidate;

    if (i < 20 || Math.random() < 0.3) {
      // Exploration: random
      candidate = z.map(v => v + randn() * 10.0 * Math.pow(0.95, i / 20));
    } else {
      // Exploitation: sample near good points
      const goodPoints = history
        .filter(h => h.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (goodPoints.length > 0) {
        const base = goodPoints[Math.floor(Math.random() * goodPoints.length)].config;
        candidate = base.map(v => v + randn() * 3.0 * Math.pow(0.95, i / 20));
      } else {
        candidate = z.map(v => v + randn() * 10.0);
      }
    }

    pushconfig(data, candidate);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;

    history.push({ config: candidate, score });

    if (score > bestScore) {
      bestScore = score;
      bestConfig = [...candidate];
      z = candidate; // Update center
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

console.log("=".repeat(80));
console.log("ADVANCED OPTIMIZATION STRATEGIES FOR ORBITAL SLING");
console.log("=".repeat(80));
console.log();

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

const strategies = [
  { name: "CMA-ES Inspired", fn: cmaES },
  { name: "Multi-Start Local Search", fn: multiStartLocalSearch },
  { name: "Differential Evolution", fn: differentialEvolution },
  { name: "Particle Swarm", fn: particleSwarm },
  { name: "Bayesian-Inspired", fn: bayesianOptimization }
];

const results = [];

for (const strategy of strategies) {
  const testDesign = JSON.parse(JSON.stringify(orbitalSling));

  console.log(`\nTesting: ${strategy.name}`);
  const startTime = Date.now();
  const result = strategy.fn(testDesign, 300);
  const endTime = Date.now();

  if (result.success) {
    const efficiency = result.range / result.peakLoad;
    console.log(`  Range:      ${result.range.toFixed(2)} units`);
    console.log(`  Peak Load:  ${result.peakLoad.toFixed(2)} N`);
    console.log(`  Efficiency: ${efficiency.toFixed(4)}`);
    console.log(`  Time:       ${((endTime - startTime) / 1000).toFixed(1)}s`);

    results.push({
      name: strategy.name,
      range: result.range,
      peakLoad: result.peakLoad,
      efficiency: efficiency,
      time: (endTime - startTime) / 1000,
      config: JSON.stringify(testDesign)
    });
  } else {
    console.log(`  ❌ Failed`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("RANKINGS");
console.log("=".repeat(80));

const byRange = [...results].sort((a, b) => b.range - a.range);
console.log("\n🥇 Best Range:");
byRange.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name}: ${r.range.toFixed(2)} units`);
});

const byEfficiency = [...results].sort((a, b) => b.efficiency - a.efficiency);
console.log("\n⚡ Best Efficiency:");
byEfficiency.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name}: ${r.efficiency.toFixed(4)} (${r.range.toFixed(0)} units)`);
});

const byTime = [...results].sort((a, b) => a.time - b.time);
console.log("\n⏱️  Fastest:");
byTime.slice(0, 3).forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name}: ${r.time.toFixed(1)}s`);
});

if (results.length > 0) {
  console.log("\n" + "=".repeat(80));
  console.log("🏆 CHAMPION ORBITAL SLING");
  console.log("=".repeat(80));
  const champion = byRange[0];
  console.log(`Strategy:    ${champion.name}`);
  console.log(`Range:       ${champion.range.toFixed(2)} units`);
  console.log(`Peak Load:   ${champion.peakLoad.toFixed(2)} N`);
  console.log(`Efficiency:  ${champion.efficiency.toFixed(4)}`);
  console.log(`Time:        ${champion.time.toFixed(1)}s`);
  console.log("\nConfiguration:");
  console.log(champion.config);
}
