import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

// Start with Pulley Sling design but modify arm tip mass to 2
// Then we'll optimize it

const newDesign = {
  "projectile": 3,
  "mainaxle": 0,
  "armtip": 1,
  "axleheight": 8,
  "timestep": 0.2,
  "duration": 35,
  "particles": [
    {"x": 546.3, "y": 584.3, "mass": 1},      // 0: Main axle
    {"x": 285.6, "y": 791.6, "mass": 2},      // 1: Arm tip (changed from 4 to 2)
    {"x": 560.6, "y": 481.2, "mass": 10},     // 2: Upper arm connection
    {"x": 1000.9, "y": 742.8, "mass": 1},     // 3: Projectile
    {"x": 645.5, "y": 541.0, "mass": 500},    // 4: Counterweight
    {"x": 72.7, "y": 730.2, "mass": 1}        // 5: Rope anchor
  ],
  "constraints": {
    "rod": [
      {"p1": 0, "p2": 1},                      // Main arm
      {"p1": 0, "p2": 2},                      // Upper arm
      {"p1": 2, "p2": 4},                      // Counterweight connection
      {"p1": 1, "p2": 2},                      // Arm rigidity
      {"p1": 0, "p2": 4, "oneway": true}       // One-way support
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

fillEmptyConstraints(newDesign);

console.log("Testing modified Pulley Sling design (arm tip mass = 2)...\n");

// Run simulation
const terminate = (state) => {
  const n = newDesign.particles.length;
  const projectileIdx = newDesign.projectile;
  const armtipIdx = newDesign.armtip;

  const projX = state[2 * projectileIdx];
  const projY = state[2 * projectileIdx + 1];
  const tipX = state[2 * armtipIdx];
  const tipY = state[2 * armtipIdx + 1];

  const dist = Math.sqrt((projX - tipX) ** 2 + (projY - tipY) ** 2);

  const initialDist = Math.sqrt(
    (newDesign.particles[projectileIdx].x - newDesign.particles[armtipIdx].x) ** 2 +
    (newDesign.particles[projectileIdx].y - newDesign.particles[armtipIdx].y) ** 2
  );

  return dist > initialDist * 1.5;
};

const [trajectories, constraintLog, forceLog] = simulate(
  newDesign.particles,
  newDesign.constraints,
  newDesign.timestep,
  newDesign.duration,
  terminate
);

const range = calculateRange(trajectories, newDesign);
const peakLoad = calculatePeakLoad(forceLog);

console.log("Modified Pulley Sling Performance:");
console.log("=" .repeat(60));
console.log(`Range: ${range.toFixed(1)} ft`);
console.log(`Peak Load: ${peakLoad.toFixed(1)} lbf`);
console.log(`Efficiency: ${(range / peakLoad).toFixed(3)} ft/lbf`);
console.log(`\nComparison to original Pulley Sling:`);
console.log(`  Original: 6298.3 ft, 11445.6 lbf (arm tip mass = 4)`);
console.log(`  Modified: ${range.toFixed(1)} ft, ${peakLoad.toFixed(1)} lbf (arm tip mass = 2)`);
console.log(`  Range change: ${((range / 6298.3 - 1) * 100).toFixed(1)}%`);
console.log(`  Load change: ${((peakLoad / 11445.6 - 1) * 100).toFixed(1)}%`);

console.log("\n" + "=".repeat(60));
console.log("\nThis design will be the basis for optimization.");
console.log("We'll use optimize() and gentlify() to improve it further.");
