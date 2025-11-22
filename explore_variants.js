import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

console.log("=" .repeat(80));
console.log("DESIGN VARIANT EXPLORATION");
console.log("=" .repeat(80));

// Variant 1: Modified Floating Arm Whipper (NASAW) with arm tip mass = 2
const nasaw_variant = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 37,
  "particles": [
    {"x": 496.3, "y": 477.6, "mass": 1},
    {"x": 677.5, "y": 471.0, "mass": 2},  // Changed from 4 to 2
    {"x": 468.0, "y": 453.5, "mass": 10},
    {"x": 557.0, "y": 431.8, "mass": 1},
    {"x": 563.0, "y": 340.7, "mass": 200}
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},
      {"p1": 0, "p2": 2},
      {"p1": 1, "p2": 3},
      {"p1": 2, "p2": 4},
      {"p1": 1, "p2": 2},
      {"p1": 0, "p2": 3, "oneway": true},
      {"p1": 0, "p2": 4, "oneway": true}
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 4, "normal": {"x": 0.6, "y": 0}}
    ]
  }
};

// Variant 2: Double Pulley System
const double_pulley = {
  "projectile": 4,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 546.3, "y": 584.3, "mass": 1},      // 0: Main axle
    {"x": 320, "y": 750, "mass": 2},          // 1: Arm tip (mass 2)
    {"x": 560.6, "y": 481.2, "mass": 10},     // 2: Upper arm connection
    {"x": 100, "y": 680, "mass": 1},          // 3: First rope anchor
    {"x": 900, "y": 700, "mass": 1},          // 4: Projectile
    {"x": 645.5, "y": 541.0, "mass": 500},    // 5: Counterweight
    {"x": 150, "y": 650, "mass": 1}           // 6: Second rope anchor
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},
      {"p1": 0, "p2": 2},
      {"p1": 2, "p2": 5},
      {"p1": 1, "p2": 2},
      {"p1": 0, "p2": 5, "oneway": true}
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 0, "normal": {"x": 0.6, "y": 1}},
      {"p": 4, "normal": {"x": 0, "y": 1}, "oneway": true},
      {"p": 3, "normal": {"x": 1, "y": 1}},
      {"p": 3, "normal": {"x": 0, "y": 1}},
      {"p": 6, "normal": {"x": 1, "y": 0.8}},
      {"p": 6, "normal": {"x": 0, "y": 1}}
    ],
    "rope": [
      {
        "p1": 3,
        "pulleys": [{"idx": 1, "wrapping": "both"}],
        "p3": 4
      },
      {
        "p1": 6,
        "pulleys": [{"idx": 2, "wrapping": "both"}],
        "p3": 4
      }
    ]
  }
};

// Variant 3: Hybrid FAT + Pulley
const fat_pulley = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 487.0, "y": 517.0, "mass": 1},      // 0: Main axle
    {"x": 346, "y": 657.6, "mass": 2},        // 1: Arm tip (mass 2)
    {"x": 589, "y": 444.7, "mass": 100},      // 2: Counterweight
    {"x": 800, "y": 673.6, "mass": 1},        // 3: Projectile
    {"x": 100, "y": 600, "mass": 1}           // 4: Rope anchor
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},
      {"p1": 0, "p2": 2},
      {"p1": 1, "p2": 2}
    ],
    "slider": [
      {"p": 0, "normal": {"x": 0, "y": 1}},
      {"p": 2, "normal": {"x": 0.6, "y": 0}},  // Floating arm
      {"p": 3, "normal": {"x": 0, "y": 1}, "oneway": true},
      {"p": 4, "normal": {"x": 1, "y": 1}},
      {"p": 4, "normal": {"x": 0, "y": 1}}
    ],
    "rope": [
      {
        "p1": 4,
        "pulleys": [{"idx": 1, "wrapping": "both"}],
        "p3": 3
      }
    ]
  }
};

// Variant 4: Compact High-Mass Design
const compact_heavy = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 500, "y": 500, "mass": 1},
    {"x": 350, "y": 600, "mass": 2},
    {"x": 520, "y": 450, "mass": 15},
    {"x": 750, "y": 650, "mass": 1},
    {"x": 550, "y": 400, "mass": 800},     // Very heavy counterweight
    {"x": 120, "y": 550, "mass": 1}
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
      {"p": 0, "normal": {"x": 0.5, "y": 1}},
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

const variants = {
  "NASAW Modified": nasaw_variant,
  "Double Pulley": double_pulley,
  "FAT + Pulley Hybrid": fat_pulley,
  "Compact Heavy": compact_heavy
};

function evaluateDesign(name, design) {
  fillEmptyConstraints(design);

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

    return {
      name,
      range,
      peakLoad,
      efficiency: range / peakLoad,
      particles: design.particles.length,
      armtipMass: design.particles[design.armtip].mass,
      counterweightMass: Math.max(...design.particles.map(p => p.mass)),
      valid: true
    };
  } catch (e) {
    return { name, range: 0, peakLoad: Infinity, valid: false, error: e.message };
  }
}

console.log("\nEvaluating base variants (before optimization)...\n");

const results = [];
for (const [name, design] of Object.entries(variants)) {
  const result = evaluateDesign(name, design);
  results.push(result);

  if (result.valid) {
    console.log(`${name}:`);
    console.log(`  Range: ${result.range.toFixed(1)} ft`);
    console.log(`  Peak Load: ${result.peakLoad.toFixed(1)} lbf`);
    console.log(`  Efficiency: ${result.efficiency.toFixed(3)} ft/lbf`);
    console.log(`  Particles: ${result.particles}`);
    console.log(`  Counterweight: ${result.counterweightMass} mass`);
    console.log();
  } else {
    console.log(`${name}: FAILED - ${result.error}\n`);
  }
}

console.log("=" .repeat(80));
console.log("\nSUMMARY (sorted by range):\n");

const validResults = results.filter(r => r.valid).sort((a, b) => b.range - a.range);

console.log("Design".padEnd(25) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Efficiency");
console.log("-".repeat(70));
for (const r of validResults) {
  console.log(
    r.name.padEnd(25) +
    r.range.toFixed(1).padEnd(15) +
    r.peakLoad.toFixed(1).padEnd(15) +
    r.efficiency.toFixed(3)
  );
}

console.log("\n" + "=" .repeat(80));
console.log("\nBest performing variant: " + validResults[0].name);
console.log("This will be the candidate for further optimization.");

// Save the best variant for optimization
console.log("\n\nSaving variants for optimization phase...");
import { writeFileSync } from 'fs';
writeFileSync('best_variants.json', JSON.stringify({
  variants: variants,
  results: validResults
}, null, 2));
console.log("Saved to best_variants.json");
