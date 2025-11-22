#!/usr/bin/env node
/**
 * Calculate the correct totalLength for the Drum Counterweight preset
 */

import { presets } from './trebuchetsimulation.js';

const presetJson = presets["Drum Counterweight"];
const data = JSON.parse(presetJson);

const ropedrum = data.constraints.ropedrum[0];
const p1_idx = ropedrum.p1;  // 4 - counterweight
const p2_idx = ropedrum.p2;  // 0 - drum center
const p3_idx = ropedrum.p3;  // 1 - drum point
const r = ropedrum.radius;  // 60

// Initial positions
const particles = data.particles;
const x1 = particles[p1_idx].x;  // 436
const y1 = particles[p1_idx].y;  // 622
const x2 = particles[p2_idx].x;  // 536
const y2 = particles[p2_idx].y;  // 472.7
const x3 = particles[p3_idx].x;  // 578
const y3 = particles[p3_idx].y;  // 515

console.log("=== Initial Configuration ===");
console.log(`p${p1_idx} (counterweight): (${x1}, ${y1})`);
console.log(`p${p2_idx} (drum center):   (${x2}, ${y2})`);
console.log(`p${p3_idx} (drum point):    (${x3}, ${y3})`);
console.log(`radius: ${r}\n`);

// Calculate
const dx = x1 - x2;
const dy = y1 - y2;
const d = Math.sqrt(dx*dx + dy*dy);

console.log(`Distance p1 to p2: ${d.toFixed(4)}`);

// Tangent length
const tangentLength = Math.sqrt(d*d - r*r);
console.log(`Tangent length: ${tangentLength.toFixed(4)}`);

// Angles
const alpha = Math.atan2(dy, dx);
console.log(`\nAngle α (p2 to p1): ${alpha.toFixed(4)} rad = ${(alpha * 180/Math.PI).toFixed(2)}°`);

const beta = Math.asin(r / d);
console.log(`Angle β (asin(r/d)): ${beta.toFixed(4)} rad = ${(beta * 180/Math.PI).toFixed(2)}°`);

const theta_T = alpha + Math.PI/2 - beta;
console.log(`Tangent point angle θ_T: ${theta_T.toFixed(4)} rad = ${(theta_T * 180/Math.PI).toFixed(2)}°`);

const theta_p3 = Math.atan2(y3 - y2, x3 - x2);
console.log(`Drum point angle θ_p3: ${theta_p3.toFixed(4)} rad = ${(theta_p3 * 180/Math.PI).toFixed(2)}°`);

// Arc angle
let arc_angle = theta_p3 - theta_T;
console.log(`\nRaw arc angle: ${arc_angle.toFixed(4)} rad = ${(arc_angle * 180/Math.PI).toFixed(2)}°`);

// Wrap to [-π, π]
while (arc_angle > Math.PI) arc_angle -= 2 * Math.PI;
while (arc_angle < -Math.PI) arc_angle += 2 * Math.PI;
console.log(`Wrapped arc angle: ${arc_angle.toFixed(4)} rad = ${(arc_angle * 180/Math.PI).toFixed(2)}°`);

const arcLength = r * arc_angle;
console.log(`Arc length: ${arcLength.toFixed(4)}`);

const totalLength = tangentLength + arcLength;
console.log(`\n=== RESULT ===`);
console.log(`Correct totalLength = ${totalLength.toFixed(4)}`);
console.log(`Current totalLength = ${ropedrum.totalLength}`);
console.log(`\n⚠️  The preset needs to be updated with totalLength=${Math.round(totalLength)}`);
