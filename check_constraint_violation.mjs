#!/usr/bin/env node
/**
 * Check if the RopeDrum constraint is actually being violated
 */

import { simulate } from './simulate.js';
import { fillEmptyConstraints, presets } from './trebuchetsimulation.js';

const presetName = "Drum Counterweight";
const presetJson = presets[presetName];
const data = JSON.parse(presetJson);
fillEmptyConstraints(data);

function terminate(trajectories) {
  return false;
}

const [trajectories] = simulate(
  data.particles,
  data.constraints,
  data.timestep,
  data.duration,
  terminate
);

// RopeDrum constraint parameters
const ropedrum = data.constraints.ropedrum[0];
const p1_idx = ropedrum.p1;  // 4
const p2_idx = ropedrum.p2;  // 0
const p3_idx = ropedrum.p3;  // 1
const r = ropedrum.radius;  // 60
const L_total = ropedrum.totalLength;  // 390

console.log("=== Constraint Violation Check ===\n");
console.log(`RopeDrum: p1=${p1_idx}, p2=${p2_idx}, p3=${p3_idx}, r=${r}, L=${L_total}\n`);

function checkConstraint(state) {
  // Get positions
  const x1 = state[2 * p1_idx];
  const y1 = state[2 * p1_idx + 1];
  const x2 = state[2 * p2_idx];
  const y2 = state[2 * p2_idx + 1];
  const x3 = state[2 * p3_idx];
  const y3 = state[2 * p3_idx + 1];

  // Distance from p1 to p2
  const dx = x1 - x2;
  const dy = y1 - y2;
  const d = Math.sqrt(dx*dx + dy*dy);

  // Tangent length
  const tangentLength = Math.sqrt(d*d - r*r);

  // Angles
  const alpha = Math.atan2(dy, dx);
  const beta = Math.asin(r / d);
  const theta_T = alpha + Math.PI/2 - beta;
  const theta_p3 = Math.atan2(y3 - y2, x3 - x2);

  // Arc angle
  let arc_angle = theta_p3 - theta_T;
  while (arc_angle > Math.PI) arc_angle -= 2 * Math.PI;
  while (arc_angle < -Math.PI) arc_angle += 2 * Math.PI;

  // Arc length
  const arcLength = r * arc_angle;

  // Total constraint value
  const C = tangentLength + arcLength - L_total;

  return {
    tangentLength,
    arcLength,
    arcAngle: arc_angle,
    total: tangentLength + arcLength,
    violation: C,
    d
  };
}

console.log("Timestep | Tangent | Arc | Total | Violation | d(p1,p2)");
console.log("---------|---------|-----|-------|-----------|----------");

for (let i = 0; i < Math.min(20, trajectories.length); i++) {
  const t = i * data.timestep;
  const result = checkConstraint(trajectories[i]);

  console.log(
    `t=${t.toFixed(1)}s`.padEnd(9) + "|" +
    result.tangentLength.toFixed(2).padStart(8) + " |" +
    result.arcLength.toFixed(2).padStart(4) + " |" +
    result.total.toFixed(2).padStart(6) + " |" +
    result.violation.toFixed(4).padStart(10) + " |" +
    result.d.toFixed(2).padStart(9)
  );
}

console.log("\nExpected total length:", L_total);
console.log("\n⚠️  If violation is non-zero and growing, the constraint is not working!");
