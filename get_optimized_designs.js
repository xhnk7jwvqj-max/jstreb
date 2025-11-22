import { readFileSync } from 'fs';

// Get the optimized designs from our exploration
const variants = JSON.parse(readFileSync('best_variants.json', 'utf8')).variants;

// Compact Heavy optimized design (from optimize_variants.js output)
const compactHeavyOptimized = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 500, "y": 500, "mass": 1},
    {"x": 350, "y": 600, "mass": 2},
    {"x": 521.4528825453926, "y": 444.76035027188516, "mass": 14.817597071863739},
    {"x": 750, "y": 650, "mass": 1},
    {"x": 550.3373971449206, "y": 411.3169755929577, "mass": 828.2460381354974},
    {"x": 3.96711368418646, "y": 552.3770306619459, "mass": 11.174674916591776}
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

// FAT + Pulley optimized (from optimize_variants.js output)
const fatPulleyOptimized = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 487.0, "y": 517.0, "mass": 1},
    {"x": 346, "y": 657.6, "mass": 2},
    {"x": 589.8851894895452, "y": 444.3815050125122, "mass": 99.88109898566995},
    {"x": 800, "y": 673.6, "mass": 1},
    {"x": 100, "y": 600, "mass": 1}
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},
      {"p1": 0, "p2": 2},
      {"p1": 1, "p2": 2}
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 2, "normal": {"x": 0.6, "y": 0}},
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true},
      {"p": 4, "normal": {"x": 1, "y": 1}},
      {"p": 4, "normal": {"x": 0, "y": 1}}
    ],
    "rope": [
      {"p1": 4, "pulleys": [{"idx": 1, "wrapping": "both"}], "p3": 3}
    ]
  }
};

console.log("Compact Heavy (Optimized):");
console.log(JSON.stringify(compactHeavyOptimized));
console.log("\n\nFAT + Pulley Hybrid (Optimized):");
console.log(JSON.stringify(fatPulleyOptimized));
