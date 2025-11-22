import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';
import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('best_variants.json', 'utf8'));
const variants = data.variants;

// Focus on the most promising: FAT + Pulley Hybrid and Compact Heavy
const toOptimize = ["FAT + Pulley Hybrid", "Compact Heavy"];

console.log("=" .repeat(80));
console.log("OPTIMIZING PROMISING VARIANTS");
console.log("=" .repeat(80));

function cloneDesign(design) {
  return JSON.parse(JSON.stringify(design));
}

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
    fillEmptyConstraints(design);
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

// Range maximization optimizer
function optimizeForRange(design, name, iterations = 800) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Optimizing ${name} for MAXIMUM RANGE`);
  console.log("=".repeat(80));

  const PROJECTILE_IDX = design.projectile;
  const ARMTIP_IDX = design.armtip;
  const MAINAXLE_IDX = design.mainaxle;

  let best = cloneDesign(design);
  let bestMetrics = evaluateDesign(best);

  console.log(`\nInitial: Range: ${bestMetrics.range.toFixed(1)} ft, Load: ${bestMetrics.peakLoad.toFixed(1)} lbf\n`);

  let step = 5;
  let stuckCounter = 0;
  const optTimeout = 50;
  let improvements = 0;

  for (let i = 0; i < iterations; i++) {
    const candidate = cloneDesign(best);

    // Mutate: modify particle positions and masses
    const mutableIndices = [];
    for (let idx = 0; idx < candidate.particles.length; idx++) {
      if (idx !== PROJECTILE_IDX && idx !== ARMTIP_IDX && idx !== MAINAXLE_IDX) {
        mutableIndices.push(idx);
      }
    }

    const idx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
    const property = Math.random() < 0.6 ? (Math.random() < 0.5 ? 'x' : 'y') : 'mass';

    if (property === 'mass') {
      candidate.particles[idx].mass += (Math.random() - 0.5) * 2 * step;
      candidate.particles[idx].mass = Math.max(1, candidate.particles[idx].mass);
    } else {
      candidate.particles[idx][property] += (Math.random() - 0.5) * 2 * step;
    }

    const metrics = evaluateDesign(candidate);

    // Accept if range increases
    if (metrics.valid && metrics.range > bestMetrics.range) {
      best = candidate;
      bestMetrics = metrics;
      stuckCounter = 0;
      improvements++;

      console.log(`[${i}] New best! Range: ${metrics.range.toFixed(1)} ft, Load: ${metrics.peakLoad.toFixed(1)} lbf, Efficiency: ${(metrics.range/metrics.peakLoad).toFixed(3)}`);
    } else {
      stuckCounter++;
    }

    if (stuckCounter >= optTimeout) {
      step *= 0.6;
      stuckCounter = 0;
      if (i % 100 === 0) {
        console.log(`[${i}] Step size: ${step.toFixed(2)}`);
      }
      if (step < 0.05) break;
    }
  }

  console.log(`\nOptimization complete! ${improvements} improvements found.`);
  console.log(`Final: Range: ${bestMetrics.range.toFixed(1)} ft, Load: ${bestMetrics.peakLoad.toFixed(1)} lbf`);

  return { design: best, metrics: bestMetrics };
}

// Optimize each variant
const optimizedResults = {};

for (const name of toOptimize) {
  const result = optimizeForRange(variants[name], name, 1000);
  optimizedResults[name] = result;
}

console.log("\n" + "=".repeat(80));
console.log("FINAL COMPARISON: All Optimized Designs");
console.log("=".repeat(80));

// Add Sky Render for comparison
const skyRender = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 546.3, "y": 584.3, "mass": 1},
    {"x": 285.6, "y": 791.6, "mass": 2},
    {"x": 551.8691239316086, "y": 484.58711088383126, "mass": 10.302944294310997},
    {"x": 1000.9, "y": 742.8, "mass": 1},
    {"x": 644.3605590649994, "y": 543.6718388335352, "mass": 494.80807699888015},
    {"x": 78.22254645032662, "y": 732.6788753627324, "mass": 1.255571284793722}
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
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "rope": [
      {"p1": 5, "pulleys": [{"idx": 1, "wrapping": "both"}], "p3": 3}
    ]
  }
};

const skyRenderMetrics = evaluateDesign(skyRender);

console.log("\nDesign".padEnd(30) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Efficiency");
console.log("-".repeat(75));

const allResults = [
  { name: "Sky Render (baseline)", ...skyRenderMetrics },
  ...Object.entries(optimizedResults).map(([name, r]) => ({ name, ...r.metrics }))
].sort((a, b) => b.range - a.range);

for (const r of allResults) {
  console.log(
    r.name.padEnd(30) +
    r.range.toFixed(1).padEnd(15) +
    r.peakLoad.toFixed(1).padEnd(15) +
    (r.range / r.peakLoad).toFixed(3)
  );
}

// Save best overall design
const bestOverall = allResults[0];
console.log("\n" + "=".repeat(80));
console.log(`\nCHAMPION: ${bestOverall.name}`);
console.log(`Range: ${bestOverall.range.toFixed(1)} ft`);
console.log(`Peak Load: ${bestOverall.peakLoad.toFixed(1)} lbf`);
console.log(`Efficiency: ${(bestOverall.range / bestOverall.peakLoad).toFixed(3)} ft/lbf`);

if (bestOverall.name !== "Sky Render (baseline)") {
  const bestDesign = optimizedResults[bestOverall.name.replace(" (optimized)", "")];
  if (bestDesign) {
    console.log("\nNew champion design JSON:");
    console.log(JSON.stringify(bestDesign.design));
  }
}
