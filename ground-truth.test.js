import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculatePeakLoad,
  calculateRange,
} from "./trebuchetsimulation.js";

test("ground truth values for default preset (Hinged Counterweight)", () => {
  // Default preset: "Hinged Counterweight"
  const data = JSON.parse(
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":536,"y":472.7,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":588,"y":440.7,"mass":10},{"x":668,"y":673.6,"mass":1},{"x":586,"y":533.7,"mass":100}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}'
  );

  // Fill in missing constraint types
  fillEmptyConstraints(data);

  function terminate(trajectories) {
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  const [trajectories, constraintLog, forceLog] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );

  // Calculate peakLoad
  const peakLoad = calculatePeakLoad(forceLog);

  // Calculate range
  const range = calculateRange(trajectories, data);

  // Verify ground truth values (same as Playwright test with ±5 tolerance)
  // Expected values: Range = 331.2 ft, Peak Force = 1020.3 lbf
  expect(range).toBeGreaterThanOrEqual(331.2 - 5);
  expect(range).toBeLessThanOrEqual(331.2 + 5);
  expect(peakLoad).toBeGreaterThanOrEqual(1020.3 - 5);
  expect(peakLoad).toBeLessThanOrEqual(1020.3 + 5);
});

test("ground truth values for Sky Render preset", () => {
  // Sky Render: Optimized design with arm tip mass = 2
  const data = JSON.parse(
    '{"projectile":3,"mainaxle":0,"armtip":1,"axleheight":8,"timestep":0.2,"duration":35,"particles":[{"x":546.3,"y":584.3,"mass":1},{"x":285.6,"y":791.6,"mass":2},{"x":551.8691239316086,"y":484.58711088383126,"mass":10.302944294310997},{"x":1000.9,"y":742.8,"mass":1},{"x":644.3605590649994,"y":543.6718388335352,"mass":494.80807699888015},{"x":78.22254645032662,"y":732.6788753627324,"mass":1.255571284793722}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":2,"p2":4},{"p1":1,"p2":2},{"p1":0,"p2":4,"oneway":true}],"slider":[{"p":3,"normal":{"x":0,"y":1},"oneway":true}],"rope":[{"p1":5,"pulleys":[{"idx":1,"wrapping":"both"}],"p3":3}],"pin":[{"count":2,"p":0},{"count":2,"p":5}],"colinear":[],"f2k":[]}}'
  );

  // Fill in missing constraint types
  fillEmptyConstraints(data);

  function terminate(trajectories) {
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  const [trajectories, constraintLog, forceLog] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );

  // Calculate peakLoad
  const peakLoad = calculatePeakLoad(forceLog);

  // Calculate range
  const range = calculateRange(trajectories, data);

  // Verify ground truth values (±5 tolerance)
  // Expected values: Range = 6515.5 ft, Peak Force = 9862.2 lbf
  // Also verify arm tip mass = 2 and projectile mass = 1
  expect(range).toBeGreaterThanOrEqual(6515.5 - 5);
  expect(range).toBeLessThanOrEqual(6515.5 + 5);
  expect(peakLoad).toBeGreaterThanOrEqual(9862.2 - 5);
  expect(peakLoad).toBeLessThanOrEqual(9862.2 + 5);
  expect(data.particles[data.armtip].mass).toBe(2);
  expect(data.particles[data.projectile].mass).toBe(1);
});
