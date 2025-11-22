import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

// Optimization algorithm based on interface.js optimize() and gentlify()
// Goal: Minimize peak load while maintaining range

let bestDesign = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 546.3, "y": 584.3, "mass": 1},
    {"x": 285.6, "y": 791.6, "mass": 2},
    {"x": 560.6, "y": 481.2, "mass": 10},
    {"x": 1000.9, "y": 742.8, "mass": 1},
    {"x": 645.5, "y": 541.0, "mass": 500},
    {"x": 72.7, "y": 730.2, "mass": 1}
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},
      {"p1": 0, "p2": 2},
      {"p1": 2, "p2": 4},
      {"p1": 1, "p2": 2},
      {"p1": 0, "p2": 4, "oneway": true}
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 0, "normal": {"x": 0.6, "y": 1}},
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true},
      {"p": 5, "normal": {"x": 1, "y": 1}},
      {"p": 5, "normal": {"x": 0, "y": 1}}
    ],
    "rope": [
      {
        "p1": 5,
        "pulleys": [{"idx": 1, "wrapping": "both"}],
        "p3": 3
      }
    ]
  }
};

fillEmptyConstraints(bestDesign);

function evaluateDesign(design) {
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

  try {
    const [trajectories, constraintLog, forceLog] = simulate(
      design.particles,
      design.constraints,
      design.timestep,
      design.duration,
      terminate
    );
    const range = calculateRange(trajectories, design);
    const peakLoad = calculatePeakLoad(forceLog);
    return { range, peakLoad, valid: true };
  } catch (e) {
    return { range: 0, peakLoad: Infinity, valid: false };
  }
}

// Constraint: Keep projectile mass = 1, arm tip mass = 2
const PROJECTILE_IDX = 3;
const ARMTIP_IDX = 1;
const MAINAXLE_IDX = 0;

function cloneDesign(design) {
  return JSON.parse(JSON.stringify(design));
}

// Simulated annealing optimization
function optimize(iterations = 500) {
  console.log("\nRunning optimization (simulated annealing)...");
  console.log("Goal: Minimize peak load while maintaining range\n");

  let current = cloneDesign(bestDesign);
  let currentMetrics = evaluateDesign(current);
  let targetRange = currentMetrics.range;

  let step = 3;
  let stuckCounter = 0;
  const optTimeout = 50;

  let bestLoad = currentMetrics.peakLoad;
  let improvements = 0;

  for (let i = 0; i < iterations; i++) {
    const candidate = cloneDesign(current);

    // Mutate: randomly modify one particle's position or mass
    // But preserve projectile mass = 1, arm tip mass = 2, and main axle mass = 1
    const mutableIndices = [2, 4, 5]; // Can modify these particles
    const idx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
    const property = Math.random() < 0.7 ? (Math.random() < 0.5 ? 'x' : 'y') : 'mass';

    if (property === 'mass') {
      candidate.particles[idx].mass += (Math.random() - 0.5) * 2 * step;
      candidate.particles[idx].mass = Math.max(1, candidate.particles[idx].mass);
    } else {
      candidate.particles[idx][property] += (Math.random() - 0.5) * 2 * step;
    }

    const metrics = evaluateDesign(candidate);

    // Accept if: reduces load AND maintains range (within 1%)
    if (metrics.valid && metrics.range >= targetRange * 0.99 && metrics.peakLoad < currentMetrics.peakLoad) {
      current = candidate;
      currentMetrics = metrics;
      stuckCounter = 0;
      improvements++;

      if (metrics.peakLoad < bestLoad) {
        bestLoad = metrics.peakLoad;
        bestDesign = cloneDesign(current);
        console.log(`[${i}] New best! Range: ${metrics.range.toFixed(1)} ft, Load: ${metrics.peakLoad.toFixed(1)} lbf`);
      }
    } else {
      stuckCounter++;
    }

    if (stuckCounter >= optTimeout) {
      step *= 0.6;
      stuckCounter = 0;
      console.log(`[${i}] Reducing step size to ${step.toFixed(2)}`);

      if (step < 0.1) {
        console.log("Step size too small, stopping.");
        break;
      }
    }
  }

  console.log(`\nOptimization complete. Found ${improvements} improvements.`);
  return evaluateDesign(bestDesign);
}

// Gaussian sampling optimization (like gentlify but for load minimization)
function gentlify(iterations = 300) {
  console.log("\nRunning gentlify (Gaussian sampling optimization)...");
  console.log("Goal: Minimize peak load while maintaining range\n");

  let current = cloneDesign(bestDesign);
  let currentMetrics = evaluateDesign(current);
  let targetRange = currentMetrics.range;

  const population = [];
  const populationSize = 20;

  // Extract mutable parameters (excluding fixed masses and rounded values)
  function extractParams(design) {
    const params = [];
    for (let i = 0; i < design.particles.length; i++) {
      if (i !== PROJECTILE_IDX && i !== ARMTIP_IDX && i !== MAINAXLE_IDX) {
        params.push(design.particles[i].x);
        params.push(design.particles[i].y);
        // Include mass only for non-fixed particles
        if (design.particles[i].mass !== Math.round(design.particles[i].mass) || design.particles[i].mass > 100) {
          params.push(design.particles[i].mass);
        }
      }
    }
    return params;
  }

  function applyParams(design, params) {
    const newDesign = cloneDesign(design);
    let paramIdx = 0;
    for (let i = 0; i < newDesign.particles.length; i++) {
      if (i !== PROJECTILE_IDX && i !== ARMTIP_IDX && i !== MAINAXLE_IDX) {
        newDesign.particles[i].x = params[paramIdx++];
        newDesign.particles[i].y = params[paramIdx++];
        if (design.particles[i].mass !== Math.round(design.particles[i].mass) || design.particles[i].mass > 100) {
          newDesign.particles[i].mass = Math.max(1, params[paramIdx++]);
        }
      }
    }
    return newDesign;
  }

  // Build initial population
  for (let i = 0; i < populationSize; i++) {
    const candidate = cloneDesign(current);
    const params = extractParams(candidate);

    // Add random noise
    for (let j = 0; j < params.length; j++) {
      params[j] += (Math.random() - 0.5) * 20;
    }

    const newDesign = applyParams(current, params);
    const metrics = evaluateDesign(newDesign);

    if (metrics.valid && metrics.range >= targetRange * 0.98) {
      population.push({ design: newDesign, load: metrics.peakLoad, range: metrics.range });
    }
  }

  population.sort((a, b) => a.load - b.load);

  let bestLoad = currentMetrics.peakLoad;
  let improvements = 0;

  for (let iter = 0; iter < iterations; iter++) {
    // Sample from top performers
    const topN = Math.min(5, population.length);
    if (topN === 0) break;

    const baseIdx = Math.floor(Math.random() * topN);
    const base = population[baseIdx];
    const baseParams = extractParams(base.design);

    // Add Gaussian noise
    const newParams = baseParams.map(p => p + (Math.random() - 0.5) * 10 * Math.exp(-iter / 100));
    const candidate = applyParams(current, newParams);
    const metrics = evaluateDesign(candidate);

    if (metrics.valid && metrics.range >= targetRange * 0.98) {
      population.push({ design: candidate, load: metrics.peakLoad, range: metrics.range });
      population.sort((a, b) => a.load - b.load);
      population.splice(populationSize); // Keep only top N

      if (metrics.peakLoad < bestLoad) {
        bestLoad = metrics.peakLoad;
        bestDesign = cloneDesign(candidate);
        improvements++;
        console.log(`[${iter}] New best! Range: ${metrics.range.toFixed(1)} ft, Load: ${metrics.peakLoad.toFixed(1)} lbf`);
      }
    }
  }

  console.log(`\nGentlify complete. Found ${improvements} improvements.`);
  return evaluateDesign(bestDesign);
}

// Run optimization
console.log("Initial design:");
const initial = evaluateDesign(bestDesign);
console.log(`Range: ${initial.range.toFixed(1)} ft`);
console.log(`Peak Load: ${initial.peakLoad.toFixed(1)} lbf`);
console.log(`Efficiency: ${(initial.range / initial.peakLoad).toFixed(3)} ft/lbf`);

// Run optimize
const afterOptimize = optimize(500);

// Run gentlify
const afterGentlify = gentlify(300);

console.log("\n" + "=".repeat(60));
console.log("FINAL RESULTS:");
console.log("=".repeat(60));
console.log(`Initial:  Range: ${initial.range.toFixed(1)} ft, Load: ${initial.peakLoad.toFixed(1)} lbf`);
console.log(`Final:    Range: ${afterGentlify.range.toFixed(1)} ft, Load: ${afterGentlify.peakLoad.toFixed(1)} lbf`);
console.log(`Improvement: Load reduced by ${((1 - afterGentlify.peakLoad / initial.peakLoad) * 100).toFixed(1)}%`);
console.log(`Range change: ${((afterGentlify.range / initial.range - 1) * 100).toFixed(1)}%`);
console.log("=".repeat(60));

console.log("\nFinal optimized design JSON:");
console.log(JSON.stringify(bestDesign));
