import { expect, test } from "vitest";
import { optimizeCMAES } from "./cmaes-optimizer.js";
import { simulate } from "./simulate.js";
import {
  fillEmptyConstraints,
  calculateRange,
  calculatePeakLoad,
} from "./trebuchetsimulation.js";

/**
 * Rosenbrock function - classic optimization benchmark
 * Global minimum at (1, 1, ..., 1) with value 0
 * f(x) = sum((1 - x_i)^2 + 100 * (x_{i+1} - x_i^2)^2)
 */
function rosenbrock(x) {
  let sum = 0;
  for (let i = 0; i < x.length - 1; i++) {
    const term1 = (1 - x[i]) ** 2;
    const term2 = 100 * (x[i + 1] - x[i] ** 2) ** 2;
    sum += term1 + term2;
  }
  // Return negative because optimizer maximizes
  return -sum;
}

test("CMA-ES optimizer finds Rosenbrock minimum (2D)", async () => {
  const initialConfig = [-1.5, 2.0]; // Start away from optimum
  let iterations = 0;
  const maxIterations = 1000;

  const result = await optimizeCMAES({
    initialConfig,
    objectiveFunction: rosenbrock,
    shouldStop: () => iterations++ >= maxIterations,
    initialStepSize: 0.5,
    populationMultiplier: 10,
  });

  // Should converge close to (1, 1)
  expect(result[0]).toBeCloseTo(1.0, 1);
  expect(result[1]).toBeCloseTo(1.0, 1);

  // Function value should be close to 0
  const finalValue = -rosenbrock(result);
  expect(finalValue).toBeLessThan(0.1);
});

test("CMA-ES optimizer finds Rosenbrock minimum (5D)", async () => {
  const initialConfig = [-1.0, 2.0, -0.5, 1.5, -2.0];
  let iterations = 0;
  const maxIterations = 3000;

  const result = await optimizeCMAES({
    initialConfig,
    objectiveFunction: rosenbrock,
    shouldStop: () => iterations++ >= maxIterations,
    initialStepSize: 0.5,
    populationMultiplier: 15,
  });

  // Function value should improve significantly from initial
  const initialValue = -rosenbrock(initialConfig);
  const finalValue = -rosenbrock(result);

  // Should improve by at least 90%
  expect(finalValue).toBeLessThan(initialValue * 0.1);

  // Should find a reasonably good solution
  expect(finalValue).toBeLessThan(10.0);
});

test("CMA-ES optimizer improves trebuchet range", async () => {
  // Start with a simple trebuchet configuration
  const data = JSON.parse(
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":536,"y":472.7,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":588,"y":440.7,"mass":10},{"x":668,"y":673.6,"mass":1},{"x":586,"y":533.7,"mass":100}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}'
  );
  fillEmptyConstraints(data);

  function terminate(trajectories) {
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  // Extract optimizable parameters (masses of particles 1-4)
  function pullconfig() {
    const config = [];
    // Only optimize masses of particles 1, 2, and 4 (skip particle 3 - projectile)
    config.push(data.particles[1].mass);
    config.push(data.particles[2].mass);
    config.push(data.particles[4].mass);
    return config;
  }

  function pushconfig(config) {
    data.particles[1].mass = Math.abs(config[0]);
    data.particles[2].mass = Math.abs(config[1]);
    data.particles[4].mass = Math.abs(config[2]);
  }

  const initialConfig = pullconfig();

  // Calculate initial range
  const [initialTrajectories] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );
  const initialRange = calculateRange(initialTrajectories, data);

  // Objective function: maximize range
  const objectiveFunction = (config) => {
    pushconfig(config);
    const [trajectories] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );
    return calculateRange(trajectories, data);
  };

  let iterations = 0;
  const maxIterations = 200;

  const result = await optimizeCMAES({
    initialConfig,
    objectiveFunction,
    shouldStop: () => iterations++ >= maxIterations,
    initialStepSize: 2.0,
    populationMultiplier: 10,
  });

  pushconfig(result);
  const [finalTrajectories] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );
  const finalRange = calculateRange(finalTrajectories, data);

  // Optimization should improve range
  expect(finalRange).toBeGreaterThan(initialRange);
  console.log(`Trebuchet range improved from ${initialRange.toFixed(1)} to ${finalRange.toFixed(1)} ft`);
});

test("CMA-ES optimizer reduces trebuchet peak load while maintaining range", async () => {
  // Start with a trebuchet configuration
  const data = JSON.parse(
    '{"projectile":3, "mainaxle":0, "armtip":1, "axleheight":8, "timestep":0.3, "duration":35, "particles":[{"x":536,"y":472.7,"mass":1},{"x":346,"y":657.6,"mass":4},{"x":588,"y":440.7,"mass":10},{"x":668,"y":673.6,"mass":1},{"x":586,"y":533.7,"mass":100}],"constraints":{"rod":[{"p1":0,"p2":1},{"p1":0,"p2":2},{"p1":1,"p2":3},{"p1":2,"p2":4},{"p1":1,"p2":2}],"slider":[{"p":0,"normal":{"x":0,"y":1}},{"p":0,"normal":{"x":0.6,"y":1}},{"p":3,"normal":{"x":0,"y":1},"oneway":true}]}}'
  );
  fillEmptyConstraints(data);

  function terminate(trajectories) {
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  // Extract optimizable parameters
  function pullconfig() {
    const config = [];
    config.push(data.particles[1].mass);
    config.push(data.particles[2].mass);
    config.push(data.particles[4].mass);
    return config;
  }

  function pushconfig(config) {
    data.particles[1].mass = Math.abs(config[0]);
    data.particles[2].mass = Math.abs(config[1]);
    data.particles[4].mass = Math.abs(config[2]);
  }

  const initialConfig = pullconfig();

  // Calculate initial metrics
  const [initialTrajectories, _, initialForceLog] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );
  const minRange = calculateRange(initialTrajectories, data);
  const initialLoad = calculatePeakLoad(initialForceLog);

  // Objective function: minimize load while maintaining range
  const objectiveFunction = (config) => {
    pushconfig(config);
    const [trajectories, __, forceLog] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );
    const range = calculateRange(trajectories, data);
    const load = calculatePeakLoad(forceLog);

    // Penalize if range drops
    if (range < minRange) {
      return -9999999999999999;
    }
    // Minimize load (maximize negative load)
    return -load;
  };

  let iterations = 0;
  const maxIterations = 200;

  const result = await optimizeCMAES({
    initialConfig,
    objectiveFunction,
    shouldStop: () => iterations++ >= maxIterations,
    initialStepSize: 2.0,
    populationMultiplier: 10,
  });

  pushconfig(result);
  const [finalTrajectories, __, finalForceLog] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );
  const finalRange = calculateRange(finalTrajectories, data);
  const finalLoad = calculatePeakLoad(finalForceLog);

  // Should maintain range
  expect(finalRange).toBeGreaterThanOrEqual(minRange - 1);

  // Should reduce peak load
  expect(finalLoad).toBeLessThan(initialLoad);

  console.log(
    `Trebuchet load reduced from ${initialLoad.toFixed(1)} to ${finalLoad.toFixed(1)} lbf ` +
    `while maintaining range ${finalRange.toFixed(1)} ft (min: ${minRange.toFixed(1)} ft)`
  );
});
