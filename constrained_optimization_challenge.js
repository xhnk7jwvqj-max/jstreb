import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculatePeakLoad,
  calculateRange,
  presets,
} from "./trebuchetsimulation.js";

global.window = { data: {} };

const TOTAL_TIME_BUDGET_MS = 20 * 60 * 1000; // 20 minutes
const LOAD_CONSTRAINT = 5000; // Maximum allowed peak load
const startTime = Date.now();

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

// Constrained objective: maximize range while penalizing load > 5000
function constrainedObjective(result) {
  if (!result.success) return -Infinity;

  if (result.peakLoad <= LOAD_CONSTRAINT) {
    return result.range; // Within constraint - maximize range
  } else {
    // Penalty: exponentially worse as load increases
    const violation = result.peakLoad - LOAD_CONSTRAINT;
    return result.range - violation * 2; // Heavy penalty
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

// Fast Multi-Start optimizer
function multiStartOptimize(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  const numStarts = 3;
  const timePerStart = timeBudgetMs / numStarts;

  let globalBest = -Infinity;
  let globalBestConfig = null;
  let globalBestResult = null;

  for (let start = 0; start < numStarts && Date.now() < endTime; start++) {
    const startEndTime = Date.now() + timePerStart;
    let z = pullconfig(data).map(v => v + randn() * 15.0);
    let step = 6.0;
    let localBest = -Infinity;
    let noImprovement = 0;

    while (Date.now() < startEndTime) {
      const newz = z.map(v => v + randn() * step);
      pushconfig(data, newz);
      const result = analyzeDesign(data);
      const score = constrainedObjective(result);

      if (score > localBest) {
        localBest = score;
        z = [...newz];
        noImprovement = 0;

        if (result.success && score > globalBest) {
          globalBest = score;
          globalBestConfig = [...newz];
          globalBestResult = result;
        }
      } else {
        noImprovement++;
      }

      if (noImprovement > 20) {
        step *= 0.7;
        noImprovement = 0;
      }
    }
  }

  if (globalBestConfig) {
    pushconfig(data, globalBestConfig);
  }
  return globalBestResult || analyzeDesign(data);
}

// Fast Differential Evolution
function differentialEvolution(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  const popSize = 12;
  const F = 0.8;
  const CR = 0.9;

  const population = [];
  for (let i = 0; i < popSize; i++) {
    const individual = z.map(v => v + randn() * 10.0);
    pushconfig(data, individual);
    const result = analyzeDesign(data);
    const score = constrainedObjective(result);
    population.push({ config: individual, score, result });
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
      const score = constrainedObjective(result);

      if (score > population[i].score) {
        population[i] = { config: trial, score, result };
      }
    }
  }

  population.sort((a, b) => b.score - a.score);
  pushconfig(data, population[0].config);
  return population[0].result;
}

// Particle Swarm
function particleSwarm(data, timeBudgetMs) {
  const endTime = Date.now() + timeBudgetMs;
  let z = pullconfig(data);
  const swarmSize = 12;
  const w = 0.7;
  const c1 = 1.5;
  const c2 = 1.5;

  const swarm = [];
  let globalBest = null;
  let globalBestScore = -Infinity;
  let globalBestResult = null;

  for (let i = 0; i < swarmSize; i++) {
    const position = z.map(v => v + randn() * 10.0);
    const velocity = z.map(() => randn() * 2.0);

    pushconfig(data, position);
    const result = analyzeDesign(data);
    const score = constrainedObjective(result);

    const particle = {
      position: position,
      velocity: velocity,
      bestPosition: [...position],
      bestScore: score,
      bestResult: result
    };

    if (score > globalBestScore) {
      globalBestScore = score;
      globalBest = [...position];
      globalBestResult = result;
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
      const score = constrainedObjective(result);

      if (score > particle.bestScore) {
        particle.bestScore = score;
        particle.bestPosition = [...particle.position];
        particle.bestResult = result;
      }

      if (score > globalBestScore) {
        globalBestScore = score;
        globalBest = [...particle.position];
        globalBestResult = result;
      }
    }
  }

  pushconfig(data, globalBest);
  return globalBestResult;
}

console.log("=".repeat(80));
console.log("CONSTRAINED OPTIMIZATION: MAXIMUM RANGE WITH LOAD ≤ 5000 N");
console.log("Time Budget: 20 minutes");
console.log("=".repeat(80));
console.log();

// Base designs to test
const baseDesigns = {
  "Enhanced F2k": JSON.parse(presets["Enhanced F2k"]),
  "F2k": JSON.parse(presets.F2k),
  "Orbital Sling": JSON.parse(presets["Orbital Sling"]),
  "Floating Arm Trebuchet": JSON.parse(presets["Floating Arm Trebuchet"]),
};

// Quick screening: test each base design
console.log("PHASE 1: Quick Screening (30 seconds per design)");
console.log("-".repeat(80));

const screeningResults = [];

for (const [name, baseData] of Object.entries(baseDesigns)) {
  const testData = JSON.parse(JSON.stringify(baseData));
  const result = analyzeDesign(testData);

  console.log(`\n${name}:`);
  console.log(`  Initial Range: ${result.range.toFixed(2)}`);
  console.log(`  Initial Load:  ${result.peakLoad.toFixed(2)} N`);
  console.log(`  Meets constraint: ${result.peakLoad <= LOAD_CONSTRAINT ? '✓' : '✗'}`);

  if (result.success) {
    screeningResults.push({
      name,
      baseData,
      initialRange: result.range,
      initialLoad: result.peakLoad,
      meetsConstraint: result.peakLoad <= LOAD_CONSTRAINT,
      score: constrainedObjective(result)
    });
  }
}

// Sort by initial constrained score
screeningResults.sort((a, b) => b.score - a.score);

const elapsed1 = (Date.now() - startTime) / 1000;
console.log(`\nScreening complete. Time used: ${elapsed1.toFixed(1)}s`);
console.log(`Time remaining: ${((TOTAL_TIME_BUDGET_MS - (Date.now() - startTime)) / 1000 / 60).toFixed(1)} minutes`);

// PHASE 2: Optimize top candidates
console.log("\n" + "=".repeat(80));
console.log("PHASE 2: Optimizing Top Candidates");
console.log("=".repeat(80));

const topCandidates = screeningResults.slice(0, 3); // Top 3 designs
const optimizers = [
  { name: "Multi-Start", fn: multiStartOptimize },
  { name: "Differential Evolution", fn: differentialEvolution },
  { name: "Particle Swarm", fn: particleSwarm }
];

const optimizationResults = [];
const timePerOptimization = Math.floor((TOTAL_TIME_BUDGET_MS - (Date.now() - startTime)) / (topCandidates.length * optimizers.length));

console.log(`\nAllocating ${(timePerOptimization / 1000).toFixed(1)}s per optimization run`);
console.log();

for (const candidate of topCandidates) {
  console.log(`\nOptimizing: ${candidate.name}`);
  console.log("-".repeat(60));

  for (const optimizer of optimizers) {
    const testData = JSON.parse(JSON.stringify(candidate.baseData));

    console.log(`  Testing ${optimizer.name}...`);
    const opStart = Date.now();
    const result = optimizer.fn(testData, timePerOptimization);
    const opTime = (Date.now() - opStart) / 1000;

    if (result.success) {
      const meetsConstraint = result.peakLoad <= LOAD_CONSTRAINT;
      console.log(`    Range: ${result.range.toFixed(2)} | Load: ${result.peakLoad.toFixed(2)} N | ${meetsConstraint ? '✓' : '✗'} | ${opTime.toFixed(1)}s`);

      optimizationResults.push({
        design: candidate.name,
        optimizer: optimizer.name,
        range: result.range,
        peakLoad: result.peakLoad,
        meetsConstraint: meetsConstraint,
        time: opTime,
        config: JSON.stringify(testData)
      });
    } else {
      console.log(`    ✗ Failed`);
    }

    // Check time budget
    const totalElapsed = (Date.now() - startTime) / 1000;
    const remaining = (TOTAL_TIME_BUDGET_MS / 1000) - totalElapsed;
    if (remaining < 10) {
      console.log(`\n⚠️  Time budget nearly exhausted (${remaining.toFixed(0)}s left)`);
      break;
    }
  }

  // Check if we should continue
  const totalElapsed = (Date.now() - startTime) / 1000;
  if (totalElapsed > TOTAL_TIME_BUDGET_MS / 1000 - 30) {
    console.log(`\n⚠️  Stopping early to leave time for analysis`);
    break;
  }
}

// PHASE 3: Results
console.log("\n" + "=".repeat(80));
console.log("FINAL RESULTS");
console.log("=".repeat(80));

const validResults = optimizationResults.filter(r => r.meetsConstraint);
const allResults = optimizationResults;

if (validResults.length > 0) {
  validResults.sort((a, b) => b.range - a.range);

  console.log("\n🏆 CHAMPION (Load ≤ 5000 N):");
  console.log("=".repeat(80));
  const champion = validResults[0];
  console.log(`Design:      ${champion.design}`);
  console.log(`Optimizer:   ${champion.optimizer}`);
  console.log(`Range:       ${champion.range.toFixed(2)} units`);
  console.log(`Peak Load:   ${champion.peakLoad.toFixed(2)} N (${((champion.peakLoad / LOAD_CONSTRAINT) * 100).toFixed(1)}% of limit)`);
  console.log(`Efficiency:  ${(champion.range / champion.peakLoad).toFixed(4)}`);
  console.log();

  console.log("Top 5 Constrained Designs:");
  console.log("-".repeat(80));
  validResults.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ${r.design.padEnd(25)} | ${r.optimizer.padEnd(20)} | ${r.range.toFixed(0).padStart(6)} range | ${r.peakLoad.toFixed(0).padStart(5)} N`);
  });

  console.log("\nConfiguration:");
  console.log(champion.config);
} else {
  console.log("\n⚠️  No designs met the load constraint!");
}

// Show best unconstrained for comparison
console.log("\n" + "=".repeat(80));
console.log("Best Unconstrained Design (for comparison):");
console.log("=".repeat(80));
allResults.sort((a, b) => b.range - a.range);
const unconstrained = allResults[0];
console.log(`Design:      ${unconstrained.design}`);
console.log(`Optimizer:   ${unconstrained.optimizer}`);
console.log(`Range:       ${unconstrained.range.toFixed(2)} units`);
console.log(`Peak Load:   ${unconstrained.peakLoad.toFixed(2)} N (${(unconstrained.peakLoad / LOAD_CONSTRAINT).toFixed(1)}x limit)`);

const totalTime = (Date.now() - startTime) / 1000 / 60;
console.log("\n" + "=".repeat(80));
console.log(`Total time used: ${totalTime.toFixed(1)} minutes`);
console.log("=".repeat(80));
