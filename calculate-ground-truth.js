// Calculate ground truth values for the default preset
import { simulate } from './simulate.js';

// Default preset: "Hinged Counterweight"
const data = JSON.parse('{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":536,"y":472.7,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":588,"y":440.7,"mass":10},{"x":668,"y":673.6,"mass":1},{"x":586,"y":533.7,"mass":100}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}');

// Fill in missing constraint types
const ctypes = ["rod", "pin", "slider", "colinear", "f2k", "rope"];
for (const ctype of ctypes) {
  if (data.constraints[ctype] === undefined) {
    data.constraints[ctype] = [];
  }
}

// Handle pin constraints from sliders
const sliderCounts = data.particles.map(() => 0);
data.constraints.slider.forEach((x) => {
  if (!x.oneway) {
    sliderCounts[x.p] += 1;
  }
});
data.constraints.slider = data.constraints.slider.filter(
  (x) => sliderCounts[x.p] < 2,
);
data.constraints.pin = data.constraints.pin.concat(
  sliderCounts
    .flatMap((x, i) => [{ count: x, p: i }])
    .filter((x) => x.count > 1),
);

function terminate(trajectories) {
  var trajectory = trajectories[trajectories.length - 1];
  var projectileY = -trajectory[2 * data.projectile + 1];
  var projectileVY = -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
  return projectileY < 0 || projectileVY < 0;
}

try {
  const [trajectories, constraintLog, forceLog] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate,
  );

  // Calculate peakLoad (same as interface.js lines 172-173)
  const peakLoad = Math.max(
    ...forceLog.slice(1).map((x) => Math.max(...x.map((y) => Math.abs(y))))
  );

  // Calculate range (same as interface.js lines 175-220)
  let axlecoord = -data.particles[data.mainaxle].y;
  let mincoord = -data.particles[data.mainaxle].y;
  let range = 0;

  for (const trajectory of trajectories) {
    for (let partIndex = 0; partIndex < data.particles.length; partIndex++) {
      if (trajectory[2 * partIndex] < 2000) {
        mincoord = Math.min(mincoord, -trajectory[2 * partIndex + 1]);
      }
      axlecoord = Math.max(axlecoord, -trajectory[2 * data.mainaxle + 1]);
    }

    range = Math.max(
      range,
      2 *
        Math.max(
          0,
          -trajectory[2 * data.particles.length + 2 * data.projectile + 1],
        ) *
        trajectory[2 * data.particles.length + 2 * data.projectile],
    );
  }

  const height1 = axlecoord - mincoord;
  const height2 = Math.sqrt(
    Math.pow(
      data.particles[data.armtip].x - data.particles[data.mainaxle].x,
      2,
    ) +
      Math.pow(
        data.particles[data.armtip].y - data.particles[data.projectile].y,
        2,
      ),
  );
  range = (range / Math.max(height1, 0.75 * height2)) * data.axleheight;

  console.log('='.repeat(60));
  console.log('GROUND TRUTH VALUES FOR DEFAULT PRESET');
  console.log('='.repeat(60));
  console.log(`Range: ${range.toFixed(1)} ft`);
  console.log(`Peak Force: ${peakLoad.toFixed(1)} lbf`);
  console.log('='.repeat(60));
  console.log('\nThese values should be used in the Playwright tests.');
} catch (error) {
  console.error('Error calculating values:', error);
  process.exit(1);
}
