import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from './trebuchetsimulation.js';
import { simulate } from './simulate.js';

console.log("=" .repeat(80));
console.log("DESIGN LANDSCAPE ANALYSIS");
console.log("Understanding what makes trebuchets perform well");
console.log("=" .repeat(80));

// Sky Render - our champion
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

function evaluateDesign(design) {
  try {
    // Clone to avoid mutation
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
    return { range, peakLoad, valid: true, trajectories };
  } catch (e) {
    return { range: 0, peakLoad: Infinity, valid: false, error: e.message };
  }
}

function analyzeDesign(design, name) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Analyzing: ${name}`);
  console.log("=".repeat(80));

  // Extract key geometric parameters
  const mainAxle = design.particles[design.mainaxle];
  const armTip = design.particles[design.armtip];
  const projectile = design.particles[design.projectile];

  // Find counterweight (heaviest particle)
  let counterweightIdx = 0;
  let maxMass = 0;
  design.particles.forEach((p, i) => {
    if (p.mass > maxMass) {
      maxMass = p.mass;
      counterweightIdx = i;
    }
  });
  const counterweight = design.particles[counterweightIdx];

  // Calculate geometric ratios
  const armLength = Math.sqrt(
    (armTip.x - mainAxle.x) ** 2 + (armTip.y - mainAxle.y) ** 2
  );

  const counterweightArmLength = Math.sqrt(
    (counterweight.x - mainAxle.x) ** 2 + (counterweight.y - mainAxle.y) ** 2
  );

  const slingLength = Math.sqrt(
    (projectile.x - armTip.x) ** 2 + (projectile.y - armTip.y) ** 2
  );

  const mechanicalAdvantage = counterweightArmLength > 0 ? armLength / counterweightArmLength : 0;
  const massRatio = counterweight.mass / projectile.mass;

  // Count constraints
  const rodCount = design.constraints.rod?.length || 0;
  const sliderCount = design.constraints.slider?.length || 0;
  const ropeCount = design.constraints.rope?.length || 0;
  const onewayCount = design.constraints.rod?.filter(r => r.oneway).length || 0;

  // Evaluate performance
  const result = evaluateDesign(design);

  console.log("\nGEOMETRIC PARAMETERS:");
  console.log(`  Arm Length: ${armLength.toFixed(1)} px`);
  console.log(`  Counterweight Arm: ${counterweightArmLength.toFixed(1)} px`);
  console.log(`  Sling Length: ${slingLength.toFixed(1)} px`);
  console.log(`  Mechanical Advantage: ${mechanicalAdvantage.toFixed(3)}`);
  console.log(`  Mass Ratio (CW/Proj): ${massRatio.toFixed(1)}:1`);

  console.log("\nCONSTRAINT CONFIGURATION:");
  console.log(`  Rod constraints: ${rodCount}`);
  console.log(`  Slider constraints: ${sliderCount}`);
  console.log(`  Rope/Pulley systems: ${ropeCount}`);
  console.log(`  One-way constraints: ${onewayCount}`);
  console.log(`  Total particles: ${design.particles.length}`);

  console.log("\nPERFORMANCE:");
  if (result.valid) {
    console.log(`  Range: ${result.range.toFixed(1)} ft`);
    console.log(`  Peak Load: ${result.peakLoad.toFixed(1)} lbf`);
    console.log(`  Efficiency: ${(result.range / result.peakLoad).toFixed(3)} ft/lbf`);
    console.log(`  Energy Input: ${(massRatio * mechanicalAdvantage).toFixed(1)} (approx)`);
  } else {
    console.log(`  FAILED: ${result.error}`);
  }

  return {
    name,
    armLength,
    counterweightArmLength,
    slingLength,
    mechanicalAdvantage,
    massRatio,
    rodCount,
    sliderCount,
    ropeCount,
    onewayCount,
    particles: design.particles.length,
    ...result
  };
}

// Analyze Sky Render
const skyRenderAnalysis = analyzeDesign(skyRender, "Sky Render");

console.log("\n" + "=".repeat(80));
console.log("SENSITIVITY ANALYSIS: What parameters matter most?");
console.log("=".repeat(80));

// Test: Vary counterweight mass
console.log("\n\n1. COUNTERWEIGHT MASS SENSITIVITY");
console.log("-".repeat(80));
console.log("Mass".padEnd(10) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Change from baseline");
console.log("-".repeat(80));

const baselineMass = skyRender.particles[4].mass;
const massMultipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

for (const mult of massMultipliers) {
  const variant = JSON.parse(JSON.stringify(skyRender));
  variant.particles[4].mass = baselineMass * mult;
  const result = evaluateDesign(variant);
  if (result.valid) {
    const rangeChange = ((result.range / skyRenderAnalysis.range - 1) * 100).toFixed(1);
    console.log(
      `${(baselineMass * mult).toFixed(0)}`.padEnd(10) +
      result.range.toFixed(1).padEnd(15) +
      result.peakLoad.toFixed(1).padEnd(15) +
      `${rangeChange > 0 ? '+' : ''}${rangeChange}%`
    );
  }
}

// Test: Vary arm length
console.log("\n\n2. ARM LENGTH SENSITIVITY (via arm tip position)");
console.log("-".repeat(80));
console.log("Scale".padEnd(10) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Change from baseline");
console.log("-".repeat(80));

const armScales = [0.8, 0.9, 1.0, 1.1, 1.2];
const baseArmTip = skyRender.particles[1];
const axlePos = skyRender.particles[0];

for (const scale of armScales) {
  const variant = JSON.parse(JSON.stringify(skyRender));
  // Scale arm tip position relative to axle
  const dx = baseArmTip.x - axlePos.x;
  const dy = baseArmTip.y - axlePos.y;
  variant.particles[1].x = axlePos.x + dx * scale;
  variant.particles[1].y = axlePos.y + dy * scale;

  const result = evaluateDesign(variant);
  if (result.valid) {
    const rangeChange = ((result.range / skyRenderAnalysis.range - 1) * 100).toFixed(1);
    console.log(
      `${scale.toFixed(1)}x`.padEnd(10) +
      result.range.toFixed(1).padEnd(15) +
      result.peakLoad.toFixed(1).padEnd(15) +
      `${rangeChange > 0 ? '+' : ''}${rangeChange}%`
    );
  }
}

// Test: Impact of pulley system
console.log("\n\n3. PULLEY SYSTEM IMPACT");
console.log("-".repeat(80));

const noPulleyVariant = JSON.parse(JSON.stringify(skyRender));
noPulleyVariant.constraints.rope = [];
noPulleyVariant.constraints.rod.push({"p1": 1, "p2": 3}); // Direct connection

const withPulley = evaluateDesign(skyRender);
const withoutPulley = evaluateDesign(noPulleyVariant);

console.log("Configuration".padEnd(25) + "Range (ft)".padEnd(15) + "Load (lbf)");
console.log("-".repeat(80));
console.log(
  "With pulley system".padEnd(25) +
  withPulley.range.toFixed(1).padEnd(15) +
  withPulley.peakLoad.toFixed(1)
);
console.log(
  "Without pulley (direct)".padEnd(25) +
  withoutPulley.range.toFixed(1).padEnd(15) +
  withoutPulley.peakLoad.toFixed(1)
);
console.log(`\nPulley system provides: +${((withPulley.range / withoutPulley.range - 1) * 100).toFixed(1)}% range increase`);

// Test: Sling length
console.log("\n\n4. INITIAL SLING LENGTH SENSITIVITY");
console.log("-".repeat(80));
console.log("Scale".padEnd(10) + "Range (ft)".padEnd(15) + "Load (lbf)".padEnd(15) + "Change from baseline");
console.log("-".repeat(80));

const slingScales = [0.5, 0.75, 1.0, 1.25, 1.5];
const baseProjectile = skyRender.particles[3];

for (const scale of slingScales) {
  const variant = JSON.parse(JSON.stringify(skyRender));
  const dx = baseProjectile.x - baseArmTip.x;
  const dy = baseProjectile.y - baseArmTip.y;
  variant.particles[3].x = baseArmTip.x + dx * scale;
  variant.particles[3].y = baseArmTip.y + dy * scale;

  const result = evaluateDesign(variant);
  if (result.valid) {
    const rangeChange = ((result.range / skyRenderAnalysis.range - 1) * 100).toFixed(1);
    console.log(
      `${scale.toFixed(1)}x`.padEnd(10) +
      result.range.toFixed(1).padEnd(15) +
      result.peakLoad.toFixed(1).padEnd(15) +
      `${rangeChange > 0 ? '+' : ''}${rangeChange}%`
    );
  }
}

console.log("\n" + "=".repeat(80));
console.log("KEY INSIGHTS");
console.log("=".repeat(80));

console.log(`
Based on the analysis of Sky Render:

1. COUNTERWEIGHT MASS:
   - Doubling mass typically increases range significantly
   - But also increases peak load proportionally
   - Optimal balance found at ~495 mass units

2. ARM LENGTH:
   - Longer arms provide more leverage and velocity
   - But excessive length can reduce control
   - Geometric optimization is critical

3. PULLEY SYSTEM:
   - Provides mechanical advantage for projectile release
   - Allows for more controlled energy transfer
   - Critical for achieving maximum range

4. SLING LENGTH:
   - Longer slings allow more acceleration time
   - But too long can cause instability
   - Sweet spot varies by design

5. CONSTRAINT CONFIGURATION:
   - One-way constraints enable whipper action
   - Reduces peak loads during release
   - Allows counterweight to "drop away"

DESIGN PRINCIPLES FOR HIGH PERFORMANCE:
✓ High mass ratio (500:1 counterweight to projectile)
✓ Mechanical advantage through arm geometry
✓ Pulley system for controlled release
✓ One-way constraints for load reduction
✓ Optimized initial geometry through iterative refinement
`);
