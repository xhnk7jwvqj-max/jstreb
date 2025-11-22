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

// All strategies adapted for time budget

function randomSearchAdaptive(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let step = 8.0;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let noImprovement = 0;
  let iterations = 0;

  while (Date.now() < endTime) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const result = analyzeDesign(data);
    iterations++;

    if (result.success && result.range > bestScore) {
      bestScore = result.range;
      bestConfig = [...newz];
      z = [...newz];
      noImprovement = 0;
    } else {
      noImprovement++;
    }

    if (noImprovement > 30) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return { result: analyzeDesign(data), iterations };
}

function simulatedAnnealing(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let currentScore = -Infinity;
  let iterations = 0;

  const result = analyzeDesign(data);
  if (result.success) {
    currentScore = result.range;
    bestScore = currentScore;
  }

  while (Date.now() < endTime) {
    const temperature = 10.0 * Math.pow(0.995, iterations);
    const step = 8.0 * Math.pow(0.98, iterations);

    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const result = analyzeDesign(data);
    iterations++;

    if (result.success) {
      const newScore = result.range;
      const delta = newScore - currentScore;

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
  return { result: analyzeDesign(data), iterations };
}

function coordinateDescent(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let iterations = 0;

  const result = analyzeDesign(data);
  if (result.success) {
    bestScore = result.range;
  }

  let coord = 0;
  let coordIter = 0;

  while (Date.now() < endTime) {
    const step = 5.0 * Math.pow(0.95, coordIter);
    const oldVal = z[coord];
    z[coord] = oldVal + randn() * step;

    pushconfig(data, z);
    const result = analyzeDesign(data);
    iterations++;

    if (result.success && result.range > bestScore) {
      bestScore = result.range;
    } else {
      z[coord] = oldVal;
    }

    coordIter++;
    if (coordIter > 20) {
      coord = (coord + 1) % z.length;
      coordIter = 0;
    }
  }

  pushconfig(data, z);
  return { result: analyzeDesign(data), iterations };
}

function populationBased(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  const z = pullconfig(data);
  const popSize = 10;
  const population = [];
  let iterations = 0;

  // Initialize population
  for (let i = 0; i < popSize; i++) {
    const individual = z.map((v) => v + randn() * 10.0);
    pushconfig(data, individual);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;
    population.push({ config: individual, score });
    iterations++;
  }

  let gen = 0;
  while (Date.now() < endTime) {
    population.sort((a, b) => b.score - a.score);
    const survivors = population.slice(0, Math.floor(popSize / 2));
    const offspring = [];

    while (offspring.length < popSize - survivors.length && Date.now() < endTime) {
      const parent1 = survivors[Math.floor(Math.random() * survivors.length)];
      const parent2 = survivors[Math.floor(Math.random() * survivors.length)];

      const child = parent1.config.map((v, i) => {
        const val = Math.random() < 0.5 ? v : parent2.config[i];
        return val + randn() * 2.0 * Math.pow(0.95, gen);
      });

      pushconfig(data, child);
      const result = analyzeDesign(data);
      const score = result.success ? result.range : -Infinity;
      offspring.push({ config: child, score });
      iterations++;
    }

    population.length = 0;
    population.push(...survivors, ...offspring);
    gen++;
  }

  population.sort((a, b) => b.score - a.score);
  pushconfig(data, population[0].config);
  return { result: analyzeDesign(data), iterations };
}

function multiStartLocalSearch(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  const timePerStart = timeBudgetMs / 5;
  let bestOverall = -Infinity;
  let bestConfig = null;
  let totalIterations = 0;

  for (let start = 0; start < 5 && Date.now() < endTime; start++) {
    const startEndTime = Date.now() + timePerStart;
    let z = pullconfig(data).map(v => v + randn() * 20.0);
    let step = 8.0;
    let bestLocal = -Infinity;
    let noImprovement = 0;

    while (Date.now() < startEndTime) {
      const newz = z.map(v => v + randn() * step);
      pushconfig(data, newz);
      const result = analyzeDesign(data);
      totalIterations++;

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
  return { result: analyzeDesign(data), iterations: totalIterations };
}

function differentialEvolution(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  const popSize = 15;
  const F = 0.8;
  const CR = 0.9;
  let iterations = 0;

  const population = [];
  for (let i = 0; i < popSize; i++) {
    const individual = z.map(v => v + randn() * 10.0);
    pushconfig(data, individual);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;
    population.push({ config: individual, score });
    iterations++;
  }

  while (Date.now() < endTime) {
    for (let i = 0; i < popSize && Date.now() < endTime; i++) {
      let a, b, c;
      do { a = Math.floor(Math.random() * popSize); } while (a === i);
      do { b = Math.floor(Math.random() * popSize); } while (b === i || b === a);
      do { c = Math.floor(Math.random() * popSize); } while (c === i || c === a || c === b);

      const mutant = population[a].config.map((val, idx) =>
        val + F * (population[b].config[idx] - population[c].config[idx])
      );

      const trial = population[i].config.map((val, idx) =>
        Math.random() < CR ? mutant[idx] : val
      );

      pushconfig(data, trial);
      const result = analyzeDesign(data);
      const score = result.success ? result.range : -Infinity;
      iterations++;

      if (score > population[i].score) {
        population[i] = { config: trial, score };
      }
    }
  }

  population.sort((a, b) => b.score - a.score);
  pushconfig(data, population[0].config);
  return { result: analyzeDesign(data), iterations };
}

function particleSwarm(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  const swarmSize = 15;
  const w = 0.7;
  const c1 = 1.5;
  const c2 = 1.5;
  let iterations = 0;

  const swarm = [];
  let globalBest = null;
  let globalBestScore = -Infinity;

  for (let i = 0; i < swarmSize; i++) {
    const position = z.map(v => v + randn() * 10.0);
    const velocity = z.map(() => randn() * 2.0);

    pushconfig(data, position);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;
    iterations++;

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

  while (Date.now() < endTime) {
    for (let particle of swarm) {
      if (Date.now() >= endTime) break;

      particle.velocity = particle.velocity.map((v, idx) => {
        const r1 = Math.random();
        const r2 = Math.random();
        return w * v +
               c1 * r1 * (particle.bestPosition[idx] - particle.position[idx]) +
               c2 * r2 * (globalBest[idx] - particle.position[idx]);
      });

      particle.position = particle.position.map((p, idx) => p + particle.velocity[idx]);

      pushconfig(data, particle.position);
      const result = analyzeDesign(data);
      const score = result.success ? result.range : -Infinity;
      iterations++;

      if (score > particle.bestScore) {
        particle.bestScore = score;
        particle.bestPosition = [...particle.position];
      }

      if (score > globalBestScore) {
        globalBestScore = score;
        globalBest = [...particle.position];
      }
    }
  }

  pushconfig(data, globalBest);
  return { result: analyzeDesign(data), iterations };
}

function bayesianOptimization(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  const history = [];
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let iterations = 0;

  while (Date.now() < endTime) {
    let candidate;

    if (iterations < 20 || Math.random() < 0.3) {
      candidate = z.map(v => v + randn() * 10.0 * Math.pow(0.95, iterations / 20));
    } else {
      const goodPoints = history
        .filter(h => h.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (goodPoints.length > 0) {
        const base = goodPoints[Math.floor(Math.random() * goodPoints.length)].config;
        candidate = base.map(v => v + randn() * 3.0 * Math.pow(0.95, iterations / 20));
      } else {
        candidate = z.map(v => v + randn() * 10.0);
      }
    }

    pushconfig(data, candidate);
    const result = analyzeDesign(data);
    const score = result.success ? result.range : -Infinity;
    iterations++;

    history.push({ config: candidate, score });

    if (score > bestScore) {
      bestScore = score;
      bestConfig = [...candidate];
      z = candidate;
    }
  }

  pushconfig(data, bestConfig);
  return { result: analyzeDesign(data), iterations };
}

console.log("=".repeat(80));
console.log("TIME-BUDGETED OPTIMIZATION COMPARISON (10 seconds each)");
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

const timeBudget = 10000; // 10 seconds

const strategies = [
  { name: "Random Search", fn: randomSearchAdaptive },
  { name: "Simulated Annealing", fn: simulatedAnnealing },
  { name: "Coordinate Descent", fn: coordinateDescent },
  { name: "Population-Based", fn: populationBased },
  { name: "Multi-Start Local Search", fn: multiStartLocalSearch },
  { name: "Differential Evolution", fn: differentialEvolution },
  { name: "Particle Swarm", fn: particleSwarm },
  { name: "Bayesian-Inspired", fn: bayesianOptimization }
];

const results = [];

for (const strategy of strategies) {
  const testDesign = JSON.parse(JSON.stringify(orbitalSling));

  console.log(`Testing: ${strategy.name}`);
  const startTime = Date.now();
  const { result, iterations } = strategy.fn(testDesign, timeBudget);
  const actualTime = (Date.now() - startTime) / 1000;

  if (result.success) {
    const efficiency = result.range / result.peakLoad;
    console.log(`  Range:      ${result.range.toFixed(2)} units`);
    console.log(`  Load:       ${result.peakLoad.toFixed(2)} N`);
    console.log(`  Efficiency: ${efficiency.toFixed(4)}`);
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Time:       ${actualTime.toFixed(1)}s`);
    console.log();

    results.push({
      name: strategy.name,
      range: result.range,
      peakLoad: result.peakLoad,
      efficiency: efficiency,
      iterations: iterations,
      time: actualTime,
      iterPerSec: iterations / actualTime,
      config: JSON.stringify(testDesign)
    });
  } else {
    console.log(`  ❌ Failed`);
    console.log();
  }
}

console.log("=".repeat(80));
console.log("RANKINGS WITH 10-SECOND TIME BUDGET");
console.log("=".repeat(80));

const byRange = [...results].sort((a, b) => b.range - a.range);
console.log("\n🥇 By Range (Higher is Better):");
byRange.forEach((r, i) => {
  const bar = "█".repeat(Math.floor(r.range / 200));
  console.log(`  ${i + 1}. ${r.name.padEnd(25)} ${r.range.toFixed(0).padStart(6)} units  ${bar}`);
});

const byEfficiency = [...results].sort((a, b) => b.efficiency - a.efficiency);
console.log("\n⚡ By Efficiency (Higher is Better):");
byEfficiency.forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name.padEnd(25)} ${r.efficiency.toFixed(4)}`);
});

const byIterations = [...results].sort((a, b) => b.iterations - a.iterations);
console.log("\n🔄 By Iterations Completed:");
byIterations.forEach((r, i) => {
  console.log(`  ${i + 1}. ${r.name.padEnd(25)} ${r.iterations.toString().padStart(5)} iterations (${r.iterPerSec.toFixed(1)}/sec)`);
});

console.log("\n" + "=".repeat(80));
console.log("DETAILED COMPARISON");
console.log("=".repeat(80));
console.log();
console.log("Strategy                  | Range  | Efficiency | Iters | Iter/s");
console.log("-".repeat(70));
results.forEach(r => {
  console.log(`${r.name.padEnd(25)} | ${r.range.toFixed(0).padStart(6)} | ${r.efficiency.toFixed(4).padStart(10)} | ${r.iterations.toString().padStart(5)} | ${r.iterPerSec.toFixed(1).padStart(6)}`);
});

if (results.length > 0) {
  console.log("\n" + "=".repeat(80));
  console.log("🏆 CHAMPION (10-Second Budget)");
  console.log("=".repeat(80));
  const champion = byRange[0];
  console.log(`Strategy:    ${champion.name}`);
  console.log(`Range:       ${champion.range.toFixed(2)} units`);
  console.log(`Peak Load:   ${champion.peakLoad.toFixed(2)} N`);
  console.log(`Efficiency:  ${champion.efficiency.toFixed(4)}`);
  console.log(`Iterations:  ${champion.iterations} (${champion.iterPerSec.toFixed(1)}/sec)`);
  console.log();

  // Compare to original
  const originalRange = 1552.16;
  const improvement = ((champion.range / originalRange - 1) * 100).toFixed(1);
  console.log(`Improvement over original Orbital Sling: ${improvement}%`);
  console.log("\nConfiguration:");
  console.log(champion.config);
}
