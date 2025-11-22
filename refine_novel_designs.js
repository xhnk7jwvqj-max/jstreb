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

    // Sanity check for numerical stability
    if (range > 1e6 || peakLoad > 1e6 || isNaN(range) || isNaN(peakLoad)) {
      return { range: 0, peakLoad: Infinity, success: false, error: "Numerical instability" };
    }

    return { range, peakLoad, success: true };
  } catch (e) {
    return { range: 0, peakLoad: Infinity, success: false, error: e.message };
  }
}

// Random normal distribution
function randn() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Full optimization
function fullOptimize(data, iterations = 400) {
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

  let step = 8.0;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];
  let noImprovement = 0;

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const { range, success } = analyzeDesign(data);
    if (success && range > bestScore) {
      bestScore = range;
      bestConfig = [...newz];
      z = [...newz];
      noImprovement = 0;
    } else {
      noImprovement++;
    }

    if (noImprovement > 40) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

console.log("=".repeat(80));
console.log("REFINING NOVEL TREBUCHET DESIGNS");
console.log("=".repeat(80));
console.log();

// Design 1: Improved Whip Chain - the most promising from initial exploration
const whipChainV2 = {
  "projectile": 6,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.25,
  "duration": 50,
  "particles": [
    {"x": 520, "y": 500, "mass": 1},        // P1: Main axle
    {"x": 700.5, "y": 470.3, "mass": 2},    // P2: Arm tip
    {"x": 570.7, "y": 460.1, "mass": 10.5}, // P3: Arm segment 1
    {"x": 540.3, "y": 430.8, "mass": 15.3}, // P4: Arm segment 2
    {"x": 580.8, "y": 360.4, "mass": 200.7}, // P5: Counterweight
    {"x": 650.2, "y": 485.5, "mass": 8.1},  // P6: Intermediate joint
    {"x": 780.2, "y": 485.5, "mass": 1}     // P7: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 2},  // First segment from axle
      {"p1": 2, "p2": 3},  // Second segment
      {"p1": 3, "p2": 4},  // To counterweight
      {"p1": 2, "p2": 5},  // To intermediate joint
      {"p1": 5, "p2": 1},  // To tip
      {"p1": 1, "p2": 6},  // Sling
      {"p1": 2, "p2": 1, "oneway": true}  // One-way for whip action
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 4, "normal": {"x": 0.6, "y": 0}},
      {"p": 6, "normal": {"x": 0, "y": 1}, "oneway": true}
    ]
  }
};

// Design 2: Lever-Sling Hybrid - combines fixed axle with sliding counterweight
const leverSling = {
  "projectile": 4,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.4,
  "duration": 40,
  "particles": [
    {"x": 500, "y": 500, "mass": 1},        // P1: Fixed axle
    {"x": 430.5, "y": 490.3, "mass": 2},    // P2: Arm tip
    {"x": 560.7, "y": 400.1, "mass": 180.5}, // P3: Sliding counterweight
    {"x": 520.8, "y": 470.4, "mass": 12.7}, // P4: Arm joint
    {"x": 630.2, "y": 545.5, "mass": 1}     // P5: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 3},  // Main arm
      {"p1": 3, "p2": 1},  // To tip
      {"p1": 3, "p2": 2},  // To counterweight
      {"p1": 1, "p2": 4}   // Sling
    ],
    "slider": [
      {"p": 2, "normal": {"x": 0.7, "y": 0}},  // CW slides horizontally
      {"p": 4, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "pin": [
      {"p": 0}  // Axle is pinned
    ]
  }
};

// Design 3: Counterweight Drop Tower - CW drops vertically for max energy
const dropTower = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.35,
  "duration": 40,
  "particles": [
    {"x": 520, "y": 500, "mass": 1},        // P1: Axle
    {"x": 440.5, "y": 495.3, "mass": 2},    // P2: Arm tip
    {"x": 560.7, "y": 300.1, "mass": 220.5}, // P3: Heavy counterweight
    {"x": 650.2, "y": 525.5, "mass": 1}     // P4: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},  // Arm
      {"p1": 0, "p2": 2},  // To counterweight
      {"p1": 1, "p2": 3}   // Sling
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},  // Axle slides vertically
      {"p": 2, "normal": {"x": 0, "y": 1}},  // CW drops straight down
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true}
    ]
  }
};

// Design 4: Enhanced F2k - F2k with optimized track angle
const enhancedF2k = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.5,
  "duration": 35,
  "particles": [
    {"x": 470, "y": 520, "mass": 1},        // P1: Slider
    {"x": 420.5, "y": 460.3, "mass": 2},    // P2: Arm tip
    {"x": 540.7, "y": 320.1, "mass": 180.5}, // P3: Counterweight
    {"x": 620.2, "y": 545.5, "mass": 1}     // P4: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 1, "p2": 3},  // Sling
      {"p1": 1, "p2": 2}   // Arm
    ],
    "slider": [
      {"p": 2, "normal": {"x": 0.7, "y": 0.2}},  // Angled track for CW
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "f2k": [
      {"reference": 1, "slider": 0, "base": 2}
    ],
    "pin": [
      {"p": 0}
    ]
  }
};

// Design 5: Trebuvator - Combines trebuchet with elevator mechanism
const trebuvator = {
  "projectile": 5,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.3,
  "duration": 40,
  "particles": [
    {"x": 520, "y": 520, "mass": 1},        // P1: Main axle
    {"x": 450.5, "y": 510.3, "mass": 2},    // P2: Arm tip
    {"x": 570.7, "y": 420.1, "mass": 150.5}, // P3: Primary mass
    {"x": 600.8, "y": 480.4, "mass": 50.7}, // P4: Lifting mass
    {"x": 540.2, "y": 360.5, "mass": 20.1}, // P5: Guide mass
    {"x": 680.2, "y": 545.5, "mass": 1}     // P6: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},  // Main arm
      {"p1": 0, "p2": 2},  // To primary mass
      {"p1": 2, "p2": 4},  // To guide
      {"p1": 1, "p2": 5}   // Sling
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 3, "normal": {"x": 0, "y": 1}},  // Lifting mass slides
      {"p": 4, "normal": {"x": 0.6, "y": 0}}, // Guide on track
      {"p": 5, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "rope": [
      {
        "p1": 2,
        "pulleys": [{"idx": 4, "wrapping": "both"}],
        "p3": 3
      }
    ]
  }
};

const designs = [
  { name: "Whip Chain V2", data: whipChainV2 },
  { name: "Lever-Sling Hybrid", data: leverSling },
  { name: "Counterweight Drop Tower", data: dropTower },
  { name: "Enhanced F2k", data: enhancedF2k },
  { name: "Trebuvator", data: trebuvator }
];

const novelDesigns = [];

for (const design of designs) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`DESIGN: ${design.name}`);
  console.log("=".repeat(70));

  const initial = analyzeDesign(design.data);

  if (!initial.success) {
    console.log(`  ❌ Initial configuration failed: ${initial.error}`);
    continue;
  }

  console.log(`  Initial: Range = ${initial.range.toFixed(2)}, Load = ${initial.peakLoad.toFixed(2)}`);
  console.log(`  Running full optimization (400 iterations)...`);

  const optimized = fullOptimize(design.data, 400);

  if (optimized.success) {
    console.log(`  ✓ Optimized: Range = ${optimized.range.toFixed(2)}, Load = ${optimized.peakLoad.toFixed(2)}`);
    console.log(`  Efficiency: ${(optimized.range / optimized.peakLoad).toFixed(4)}`);
    console.log(`  Improvement: ${((optimized.range / initial.range - 1) * 100).toFixed(1)}% increase in range`);

    novelDesigns.push({
      name: design.name,
      range: optimized.range,
      peakLoad: optimized.peakLoad,
      efficiency: optimized.range / optimized.peakLoad,
      data: JSON.stringify(design.data)
    });
  } else {
    console.log(`  ❌ Optimization failed`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("FINAL RANKINGS - NOVEL DESIGNS");
console.log("=".repeat(80));

const sorted = novelDesigns.sort((a, b) => b.range - a.range);
sorted.forEach((d, i) => {
  console.log(`\n${i + 1}. ${d.name}`);
  console.log(`   Range:      ${d.range.toFixed(2)} units`);
  console.log(`   Peak Load:  ${d.peakLoad.toFixed(2)} N`);
  console.log(`   Efficiency: ${d.efficiency.toFixed(4)}`);
});

if (sorted.length > 0) {
  console.log("\n" + "=".repeat(80));
  console.log("🏆 BEST NOVEL DESIGN");
  console.log("=".repeat(80));
  console.log(`Name:       ${sorted[0].name}`);
  console.log(`Range:      ${sorted[0].range.toFixed(2)} units`);
  console.log(`Peak Load:  ${sorted[0].peakLoad.toFixed(2)} N`);
  console.log(`Efficiency: ${sorted[0].efficiency.toFixed(4)}`);
  console.log("\nJSON Configuration:");
  console.log(sorted[0].data);

  // Compare to Super F2k (28,403 range)
  const superF2kRange = 28403.53;
  const comparison = (sorted[0].range / superF2kRange * 100).toFixed(1);
  console.log(`\nComparison to Super F2k: ${comparison}% of its range`);
}
