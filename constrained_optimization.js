import { presets, fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

console.log("=" .repeat(80));
console.log("CONSTRAINED OPTIMIZATION: Maximum Range with ≤5000 lbf Peak Load");
console.log("Time Budget: 20 minutes total");
console.log("=" .repeat(80));

const FORCE_BUDGET = 5000;
const startTime = Date.now();

function evaluateDesign(design) {
  try {
    const d = JSON.parse(JSON.stringify(design));
    fillEmptyConstraints(d);

    const terminate = (state) => {
      const projectileIdx = d.projectile;
      const armtipIdx = d.armtip;
      const projX = state[2 * projectileIdx];
      const projY = state[2 * projectileIdx + 1];
      const tipX = state[2 * armtipIdx];
      const tipY = state[2 * armtipIdx + 1];
      const dist = Math.sqrt((projX - tipX) ** 2 + (projY - tipY) ** 2);
      const initialDist = Math.sqrt(
        (d.particles[projectileIdx].x - d.particles[armtipIdx].x) ** 2 +
        (d.particles[projectileIdx].y - d.particles[armtipIdx].y) ** 2
      );
      return dist > initialDist * 1.5;
    };

    const [trajectories, constraintLog, forceLog] = simulate(
      d.particles,
      d.constraints,
      d.timestep,
      d.duration,
      terminate
    );
    const range = calculateRange(trajectories, d);
    const peakLoad = calculatePeakLoad(forceLog);
    return { range, peakLoad, valid: true };
  } catch (e) {
    return { range: 0, peakLoad: Infinity, valid: false };
  }
}

function cloneDesign(design) {
  return JSON.parse(JSON.stringify(design));
}

// Constrained optimization: maximize range subject to peakLoad <= FORCE_BUDGET
function optimizeConstrained(design, name, iterations = 400) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Optimizing: ${name}`);
  console.log("=".repeat(80));

  const PROJECTILE_IDX = design.projectile;
  const ARMTIP_IDX = design.armtip;
  const MAINAXLE_IDX = design.mainaxle;

  let best = cloneDesign(design);
  let bestMetrics = evaluateDesign(best);

  // If over budget, we need to reduce forces first
  if (bestMetrics.peakLoad > FORCE_BUDGET) {
    console.log(`Initial load ${bestMetrics.peakLoad.toFixed(1)} OVER BUDGET. Reducing...`);
  } else {
    console.log(`Initial: ${bestMetrics.range.toFixed(1)} ft @ ${bestMetrics.peakLoad.toFixed(1)} lbf ✓`);
  }

  let step = 4;
  let stuckCounter = 0;
  const optTimeout = 40;
  let improvements = 0;

  for (let i = 0; i < iterations; i++) {
    // Time check
    const elapsed = (Date.now() - startTime) / 1000 / 60;
    if (elapsed > 18) { // Leave 2 min buffer
      console.log(`Time limit approaching (${elapsed.toFixed(1)} min), stopping...`);
      break;
    }

    const candidate = cloneDesign(best);

    // Mutate
    const mutableIndices = [];
    for (let idx = 0; idx < candidate.particles.length; idx++) {
      if (idx !== PROJECTILE_IDX && idx !== ARMTIP_IDX && idx !== MAINAXLE_IDX) {
        mutableIndices.push(idx);
      }
    }

    const idx = mutableIndices[Math.floor(Math.random() * mutableIndices.length)];
    const property = Math.random() < 0.65 ? (Math.random() < 0.5 ? 'x' : 'y') : 'mass';

    if (property === 'mass') {
      candidate.particles[idx].mass += (Math.random() - 0.5) * 2 * step;
      candidate.particles[idx].mass = Math.max(1, candidate.particles[idx].mass);
    } else {
      candidate.particles[idx][property] += (Math.random() - 0.5) * 2 * step;
    }

    const metrics = evaluateDesign(candidate);

    // Accept if: within budget AND better range
    // OR if over budget, accept if it reduces load
    let accept = false;
    if (metrics.valid) {
      if (bestMetrics.peakLoad <= FORCE_BUDGET) {
        // Currently valid: accept if still valid and better range
        accept = metrics.peakLoad <= FORCE_BUDGET && metrics.range > bestMetrics.range;
      } else {
        // Currently over budget: accept if reduces load OR (within budget and better range)
        accept = metrics.peakLoad < bestMetrics.peakLoad ||
                 (metrics.peakLoad <= FORCE_BUDGET && metrics.range > bestMetrics.range);
      }
    }

    if (accept) {
      best = candidate;
      bestMetrics = metrics;
      stuckCounter = 0;
      improvements++;

      const status = bestMetrics.peakLoad <= FORCE_BUDGET ? "✓" : "OVER";
      console.log(`[${i}] ${bestMetrics.range.toFixed(1)} ft @ ${bestMetrics.peakLoad.toFixed(1)} lbf ${status}`);
    } else {
      stuckCounter++;
    }

    if (stuckCounter >= optTimeout) {
      step *= 0.65;
      stuckCounter = 0;
      if (step < 0.08) break;
    }
  }

  console.log(`\nComplete! ${improvements} improvements`);
  console.log(`Final: ${bestMetrics.range.toFixed(1)} ft @ ${bestMetrics.peakLoad.toFixed(1)} lbf`);

  return { design: best, metrics: bestMetrics };
}

// Test candidates from existing presets
console.log("\n" + "=".repeat(80));
console.log("PHASE 1: Evaluating Starting Candidates");
console.log("=".repeat(80));

const candidates = [
  { name: "NASAW (original)", design: JSON.parse(presets["Floating Arm Whipper (NASAW)"]) },
  { name: "NASAW Lightweight", design: JSON.parse(presets["NASAW Lightweight"]) },
  { name: "Whipper", design: JSON.parse(presets["Whipper"]) },
  { name: "FAT", design: JSON.parse(presets["Floating Arm Trebuchet"]) },
];

console.log("\nCandidate".padEnd(25) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Status");
console.log("-".repeat(70));

const results = [];
for (const {name, design} of candidates) {
  const metrics = evaluateDesign(design);
  const status = metrics.peakLoad <= FORCE_BUDGET ? "✓ VALID" : "OVER";
  results.push({ name, design, metrics, status });

  console.log(
    name.padEnd(25) +
    metrics.range.toFixed(1).padEnd(15) +
    metrics.peakLoad.toFixed(1).padEnd(15) +
    status
  );
}

// Find best valid starting point
const validCandidates = results.filter(r => r.metrics.peakLoad <= FORCE_BUDGET);
const bestStart = validCandidates.sort((a, b) => b.metrics.range - a.metrics.range)[0];

console.log(`\nBest valid starting point: ${bestStart.name}`);

// Also try optimizing from over-budget designs by reducing them
console.log("\n" + "=".repeat(80));
console.log("PHASE 2: Multi-Strategy Optimization");
console.log("=".repeat(80));

const optimizationRuns = [];

// Strategy 1: Optimize best valid candidate
console.log(`\nStrategy 1: Optimize from ${bestStart.name}`);
const opt1 = optimizeConstrained(bestStart.design, `${bestStart.name} (optimized)`, 400);
optimizationRuns.push({ name: `${bestStart.name} optimized`, ...opt1 });

// Strategy 2: Scale down Sky Render and optimize
console.log(`\nStrategy 2: Scale down Sky Render`);
const skyRender = JSON.parse(presets["Sky Render"]);
// Reduce counterweight mass to bring forces down
const cwIdx = skyRender.particles.findIndex((p, i) =>
  i !== skyRender.projectile && i !== skyRender.armtip && p.mass > 100
);
skyRender.particles[cwIdx].mass *= 0.35; // Reduce to ~173 mass

const opt2 = optimizeConstrained(skyRender, "Sky Render (reduced CW)", 400);
optimizationRuns.push({ name: "Sky Render reduced", ...opt2 });

// Strategy 3: Try a custom lightweight design
console.log(`\nStrategy 3: Custom lightweight pulley design`);
const lightweight = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 546.3, "y": 584.3, "mass": 1},
    {"x": 285.6, "y": 791.6, "mass": 2},
    {"x": 560, "y": 485, "mass": 12},
    {"x": 1000.9, "y": 742.8, "mass": 1},
    {"x": 640, "y": 545, "mass": 180},
    {"x": 78, "y": 732, "mass": 1}
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

const opt3 = optimizeConstrained(lightweight, "Custom lightweight", 400);
optimizationRuns.push({ name: "Custom lightweight", ...opt3 });

// Final comparison
console.log("\n" + "=".repeat(80));
console.log("FINAL RESULTS");
console.log("=".repeat(80));

const validResults = optimizationRuns.filter(r => r.metrics.peakLoad <= FORCE_BUDGET);
validResults.sort((a, b) => b.metrics.range - a.metrics.range);

console.log("\nDesign".padEnd(30) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Efficiency");
console.log("-".repeat(75));

for (const r of validResults) {
  console.log(
    r.name.padEnd(30) +
    r.metrics.range.toFixed(1).padEnd(15) +
    r.metrics.peakLoad.toFixed(1).padEnd(15) +
    (r.metrics.range / r.metrics.peakLoad).toFixed(3)
  );
}

if (validResults.length > 0) {
  const winner = validResults[0];
  console.log("\n" + "=".repeat(80));
  console.log("🏆 WINNER: " + winner.name);
  console.log("=".repeat(80));
  console.log(`Range: ${winner.metrics.range.toFixed(1)} ft`);
  console.log(`Peak Load: ${winner.metrics.peakLoad.toFixed(1)} lbf (${((winner.metrics.peakLoad/FORCE_BUDGET)*100).toFixed(1)}% of budget)`);
  console.log(`Efficiency: ${(winner.metrics.range / winner.metrics.peakLoad).toFixed(3)} ft/lbf`);

  console.log("\nOptimized design JSON:");
  console.log(JSON.stringify(winner.design));
}

const totalTime = (Date.now() - startTime) / 1000 / 60;
console.log(`\nTotal time: ${totalTime.toFixed(2)} minutes`);
