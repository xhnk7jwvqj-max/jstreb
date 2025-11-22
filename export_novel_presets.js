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

function quickOptimize(data, iterations = 200) {
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

  let step = 6.0;
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

    if (noImprovement > 35) {
      step *= 0.7;
      noImprovement = 0;
    }
  }

  pushconfig(data, bestConfig);
  return analyzeDesign(data);
}

// All novel designs
const designs = {
  "Whip Chain": {
    "projectile": 6,
    "mainaxle": 0,
    "armtip": 1,
    "axleheight": 8,
    "timestep": 0.25,
    "duration": 50,
    "particles": [
      {"x": 520, "y": 500, "mass": 1},
      {"x": 700.5, "y": 470.3, "mass": 2},
      {"x": 570.7, "y": 460.1, "mass": 10.5},
      {"x": 540.3, "y": 430.8, "mass": 15.3},
      {"x": 580.8, "y": 360.4, "mass": 200.7},
      {"x": 650.2, "y": 485.5, "mass": 8.1},
      {"x": 780.2, "y": 485.5, "mass": 1}
    ],
    "constraints": {
      "rod": [
        {"p1": 0, "p2": 2},
        {"p1": 2, "p2": 3},
        {"p1": 3, "p2": 4},
        {"p1": 2, "p2": 5},
        {"p1": 5, "p2": 1},
        {"p1": 1, "p2": 6},
        {"p1": 2, "p2": 1, "oneway": true}
      ],
      "slider": [
        {"p": 0, "normal": {"x": 0, "y": 1}},
        {"p": 4, "normal": {"x": 0.6, "y": 0}},
        {"p": 6, "normal": {"x": 0, "y": 1}, "oneway": true}
      ]
    }
  },

  "Trebuvator": {
    "projectile": 5,
    "mainaxle": 0,
    "armtip": 1,
    "axleheight": 8,
    "timestep": 0.3,
    "duration": 40,
    "particles": [
      {"x": 520, "y": 520, "mass": 1},
      {"x": 450.5, "y": 510.3, "mass": 2},
      {"x": 570.7, "y": 420.1, "mass": 150.5},
      {"x": 600.8, "y": 480.4, "mass": 50.7},
      {"x": 540.2, "y": 360.5, "mass": 20.1},
      {"x": 680.2, "y": 545.5, "mass": 1}
    ],
    "constraints": {
      "rod": [
        {"p1": 0, "p2": 1},
        {"p1": 0, "p2": 2},
        {"p1": 2, "p2": 4},
        {"p1": 1, "p2": 5}
      ],
      "slider": [
        {"p": 0, "normal": {"x": 0, "y": 1}},
        {"p": 3, "normal": {"x": 0, "y": 1}},
        {"p": 4, "normal": {"x": 0.6, "y": 0}},
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
  },

  "Lever-Sling Hybrid": {
    "projectile": 4,
    "mainaxle": 0,
    "armtip": 1,
    "axleheight": 8,
    "timestep": 0.4,
    "duration": 40,
    "particles": [
      {"x": 500, "y": 500, "mass": 1},
      {"x": 430.5, "y": 490.3, "mass": 2},
      {"x": 560.7, "y": 400.1, "mass": 180.5},
      {"x": 520.8, "y": 470.4, "mass": 12.7},
      {"x": 630.2, "y": 545.5, "mass": 1}
    ],
    "constraints": {
      "rod": [
        {"p1": 0, "p2": 3},
        {"p1": 3, "p2": 1},
        {"p1": 3, "p2": 2},
        {"p1": 1, "p2": 4}
      ],
      "slider": [
        {"p": 2, "normal": {"x": 0.7, "y": 0}},
        {"p": 4, "normal": {"x": 0, "y": 1}, "oneway": true}
      ],
      "pin": [
        {"p": 0}
      ]
    }
  },

  "Triple Pulley": {
    "projectile": 6,
    "mainaxle": 0,
    "armtip": 1,
    "axleheight": 8,
    "timestep": 0.25,
    "duration": 40,
    "particles": [
      {"x": 520, "y": 550, "mass": 1},
      {"x": 320.5, "y": 750.3, "mass": 2},
      {"x": 545.7, "y": 480.1, "mass": 12.5},
      {"x": 600.3, "y": 510.8, "mass": 250.3},
      {"x": 180.8, "y": 720.4, "mass": 8.7},
      {"x": 90.2, "y": 680.5, "mass": 7.1},
      {"x": 850.2, "y": 725.5, "mass": 1}
    ],
    "constraints": {
      "rod": [
        {"p1": 0, "p2": 1},
        {"p1": 0, "p2": 2},
        {"p1": 1, "p2": 6}
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
  },

  "Orbital Sling": {
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
  }
};

console.log("Optimizing all novel designs for preset export...\n");

const optimizedPresets = {};

for (const [name, data] of Object.entries(designs)) {
  console.log(`Optimizing ${name}...`);
  const result = quickOptimize(data, 200);

  if (result.success && result.range > 100) {
    console.log(`  ✓ Range: ${result.range.toFixed(2)}, Load: ${result.peakLoad.toFixed(2)}`);
    optimizedPresets[name] = JSON.stringify(data);
  } else {
    console.log(`  ❌ Failed or poor performance`);
  }
}

console.log("\n" + "=".repeat(80));
console.log("PRESET EXPORTS (add these to trebuchetsimulation.js):");
console.log("=".repeat(80));

for (const [name, json] of Object.entries(optimizedPresets)) {
  console.log(`  "${name}":`);
  console.log(`    '${json}',`);
}
