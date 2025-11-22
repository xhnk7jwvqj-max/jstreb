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

// Quick optimization
function quickOptimize(data, iterations = 100) {
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

  let step = 5.0;
  let z = pullconfig(data);
  let bestScore = -Infinity;
  let bestConfig = [...z];

  for (let i = 0; i < iterations; i++) {
    const newz = z.map((el) => el + randn() * step);
    pushconfig(data, newz);

    const { range, success } = analyzeDesign(data);
    if (success && range > bestScore) {
      bestScore = range;
      bestConfig = [...newz];
      z = [...newz];
    }

    if (i % 30 === 29) step *= 0.7;
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

console.log("=".repeat(80));
console.log("EXPLORING NOVEL TREBUCHET CONFIGURATIONS");
console.log("=".repeat(80));
console.log();

const novelDesigns = [];

// Design 1: Dual Counterweight Cascade
// Two counterweights that can move independently for sequential energy release
const dualCounterweight = {
  "projectile": 5,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.4,
  "duration": 40,
  "particles": [
    {"x": 500, "y": 520, "mass": 1},        // P1: Main axle
    {"x": 445.5, "y": 515.3, "mass": 2},    // P2: Arm tip
    {"x": 520.7, "y": 440.1, "mass": 100.5}, // P3: Primary counterweight
    {"x": 560.3, "y": 380.8, "mass": 80.3},  // P4: Secondary counterweight
    {"x": 505.8, "y": 470.4, "mass": 15.7},  // P5: Connecting joint
    {"x": 655.2, "y": 625.5, "mass": 1}      // P6: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 1, "p2": 5},  // Sling
      {"p1": 1, "p2": 4},  // Primary arm
      {"p1": 4, "p2": 2},  // Secondary connection
      {"p1": 2, "p2": 3}   // Counterweight linkage
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 2, "normal": {"x": 0.6, "y": 0}},  // Primary CW slides
      {"p": 3, "normal": {"x": 0.7, "y": 0}},  // Secondary CW slides independently
      {"p": 5, "normal": {"x": 0, "y": 1}, "oneway": true}
    ]
  }
};

// Design 2: Triple Pulley Advantage
// Multiple pulleys for mechanical advantage
const triplePulley = {
  "projectile": 6,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.25,
  "duration": 40,
  "particles": [
    {"x": 520, "y": 550, "mass": 1},        // P1: Main axle
    {"x": 320.5, "y": 750.3, "mass": 2},    // P2: Arm tip
    {"x": 545.7, "y": 480.1, "mass": 12.5}, // P3: Pulley 1
    {"x": 600.3, "y": 510.8, "mass": 250.3}, // P4: Counterweight
    {"x": 180.8, "y": 720.4, "mass": 8.7},  // P5: Pulley 2
    {"x": 90.2, "y": 680.5, "mass": 7.1},   // P6: Pulley 3
    {"x": 850.2, "y": 725.5, "mass": 1}     // P7: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},  // Main arm
      {"p1": 0, "p2": 2},  // Support
      {"p1": 1, "p2": 6}   // Sling
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 0, "normal": {"x": 0.6, "y": 1}},
      {"p": 6, "normal": {"x": 0, "y": 1}, "oneway": true},
      {"p": 5, "normal": {"x": 0, "y": 1}},
      {"p": 4, "normal": {"x": 1, "y": 0}}
    ],
    "rope": [
      {
        "p1": 3,
        "pulleys": [
          {"idx": 2, "wrapping": "both"},
          {"idx": 4, "wrapping": "both"},
          {"idx": 5, "wrapping": "both"}
        ],
        "p3": 6
      }
    ]
  }
};

// Design 3: Whip Chain - Multiple articulated segments
const whipChain = {
  "projectile": 7,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 45,
  "particles": [
    {"x": 520, "y": 500, "mass": 1},        // P1: Main axle
    {"x": 650.5, "y": 480.3, "mass": 2},    // P2: Arm segment 1
    {"x": 550.7, "y": 460.1, "mass": 8.5},  // P3: Arm segment 2
    {"x": 500.3, "y": 420.8, "mass": 12.3}, // P4: Arm segment 3
    {"x": 560.8, "y": 380.4, "mass": 100.7}, // P5: Counterweight
    {"x": 600.2, "y": 500.5, "mass": 6.1},  // P6: Joint 1
    {"x": 580.9, "y": 470.2, "mass": 5.3},  // P7: Joint 2
    {"x": 720.2, "y": 495.5, "mass": 1}     // P8: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 2},  // First segment
      {"p1": 2, "p2": 3},  // Second segment
      {"p1": 3, "p2": 4},  // Third segment to CW
      {"p1": 0, "p2": 5},  // Joint connections
      {"p1": 2, "p2": 6},
      {"p1": 5, "p2": 1},  // Tip connections
      {"p1": 6, "p2": 1},
      {"p1": 1, "p2": 7}   // Sling
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 4, "normal": {"x": 0.6, "y": 0}},
      {"p": 7, "normal": {"x": 0, "y": 1}, "oneway": true}
    ]
  }
};

// Design 4: Orbital Sling - Counterweight on circular track
const orbitalSling = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.35,
  "duration": 40,
  "particles": [
    {"x": 500, "y": 500, "mass": 1},        // P1: Center/axle
    {"x": 440.5, "y": 510.3, "mass": 2},    // P2: Arm tip
    {"x": 550.7, "y": 400.1, "mass": 150.5}, // P3: Counterweight on track
    {"x": 650.2, "y": 525.5, "mass": 1}     // P4: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},  // Arm
      {"p1": 0, "p2": 2},  // CW connection (acts as radius)
      {"p1": 1, "p2": 3}   // Sling
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "colinear": [
      {"reference": 0, "slider": 2, "base": 1}  // CW constrained to circular path
    ]
  }
};

// Design 5: Spring-Release - Uses one-way constraints for energy storage
const springRelease = {
  "projectile": 5,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.3,
  "duration": 40,
  "particles": [
    {"x": 500, "y": 520, "mass": 1},        // P1: Main axle
    {"x": 445.5, "y": 515.3, "mass": 2},    // P2: Arm tip
    {"x": 540.7, "y": 440.1, "mass": 120.5}, // P3: Counterweight
    {"x": 520.8, "y": 480.4, "mass": 15.7}, // P4: Spring joint
    {"x": 570.2, "y": 460.5, "mass": 20.1}, // P5: Energy storage mass
    {"x": 655.2, "y": 625.5, "mass": 1}     // P6: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 1, "p2": 5},  // Sling
      {"p1": 1, "p2": 3},  // Primary arm
      {"p1": 3, "p2": 2},  // CW connection
      {"p1": 3, "p2": 4},  // Spring arm
      {"p1": 4, "p2": 0, "oneway": true}  // One-way for spring effect
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 2, "normal": {"x": 0.65, "y": 0}},
      {"p": 5, "normal": {"x": 0, "y": 1}, "oneway": true}
    ]
  }
};

// Design 6: Double F2k - Two F2k mechanisms in series
const doubleF2k = {
  "projectile": 4,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.5,
  "duration": 40,
  "particles": [
    {"x": 470, "y": 520, "mass": 1},        // P1: First slider
    {"x": 430.5, "y": 480.3, "mass": 2},    // P2: Arm tip
    {"x": 550.7, "y": 380.1, "mass": 140.5}, // P3: Primary counterweight
    {"x": 510.8, "y": 450.4, "mass": 1.7},  // P4: Intermediate slider
    {"x": 640.2, "y": 545.5, "mass": 1}     // P5: Projectile
  ],
  "constraints": {
    "rod": [
      {"p1": 1, "p2": 4},  // Sling
      {"p1": 1, "p2": 2}   // Arm
    ],
    "slider": [
      {"p": 2, "normal": {"x": 0.6, "y": 0}},
      {"p": 4, "normal": {"x": 0, "y": 1}, "oneway": true}
    ],
    "f2k": [
      {"reference": 1, "slider": 0, "base": 2},  // First F2k
      {"reference": 1, "slider": 3, "base": 2}   // Second F2k
    ],
    "pin": [
      {"p": 0}  // Pin first slider
    ]
  }
};

// Test all designs
const designs = [
  { name: "Dual Counterweight Cascade", data: dualCounterweight },
  { name: "Triple Pulley Advantage", data: triplePulley },
  { name: "Whip Chain", data: whipChain },
  { name: "Orbital Sling", data: orbitalSling },
  { name: "Spring Release", data: springRelease },
  { name: "Double F2k", data: doubleF2k }
];

for (const design of designs) {
  console.log(`\nTesting: ${design.name}`);
  console.log("-".repeat(60));

  const initial = analyzeDesign(design.data);

  if (!initial.success) {
    console.log(`  ❌ Initial configuration failed: ${initial.error}`);
    continue;
  }

  console.log(`  Initial: Range = ${initial.range.toFixed(2)}, Load = ${initial.peakLoad.toFixed(2)}`);

  console.log(`  Optimizing...`);
  const optimized = quickOptimize(design.data, 150);

  if (optimized.success) {
    console.log(`  ✓ Optimized: Range = ${optimized.range.toFixed(2)}, Load = ${optimized.peakLoad.toFixed(2)}`);
    console.log(`  Efficiency: ${(optimized.range / optimized.peakLoad).toFixed(4)}`);

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
console.log("NOVEL DESIGNS SUMMARY");
console.log("=".repeat(80));

const sorted = novelDesigns.sort((a, b) => b.range - a.range);
sorted.forEach((d, i) => {
  console.log(`\n${i + 1}. ${d.name}`);
  console.log(`   Range: ${d.range.toFixed(2)} units`);
  console.log(`   Peak Load: ${d.peakLoad.toFixed(2)} N`);
  console.log(`   Efficiency: ${d.efficiency.toFixed(4)}`);
});

if (sorted.length > 0) {
  console.log("\n" + "=".repeat(80));
  console.log("BEST NOVEL DESIGN:");
  console.log("=".repeat(80));
  console.log(`Name: ${sorted[0].name}`);
  console.log(`Range: ${sorted[0].range.toFixed(2)} units`);
  console.log(`Peak Load: ${sorted[0].peakLoad.toFixed(2)} N`);
  console.log(`Efficiency: ${sorted[0].efficiency.toFixed(4)}`);
  console.log("\nConfiguration:");
  console.log(sorted[0].data);
}
