import { expect, test } from "vitest";
import { simulate } from "./simulate.js";
import { fillEmptyConstraints, presets } from "./trebuchetsimulation.js";

/**
 * Calculate Euclidean distance between two states (positions only)
 * @param {Array} state1 - First state array
 * @param {Array} state2 - Second state array
 * @param {number} numParticles - Number of particles
 * @returns {number} Euclidean distance
 */
function calculateStateDistance(state1, state2, numParticles) {
  let sumSquares = 0;
  for (let i = 0; i < 2 * numParticles; i++) {
    const diff = state1[i] - state2[i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

/**
 * Calculate velocity divergence between two states
 * @param {Array} state1 - First state array
 * @param {Array} state2 - Second state array
 * @param {number} numParticles - Number of particles
 * @returns {number} Velocity divergence
 */
function calculateVelocityDivergence(state1, state2, numParticles) {
  let sumSquares = 0;
  const offset = 2 * numParticles;
  for (let i = 0; i < 2 * numParticles; i++) {
    const diff = state1[offset + i] - state2[offset + i];
    sumSquares += diff * diff;
  }
  return Math.sqrt(sumSquares);
}

/**
 * Perform sensitivity analysis on a preset
 * @param {string} presetName - Name of the preset
 * @param {string} presetJson - JSON string of preset configuration
 * @param {number} perturbationSize - Size of initial perturbation (default 0.01)
 * @returns {Object} Sensitivity metrics
 */
function analyzeSensitivity(presetName, presetJson, perturbationSize = 0.01) {
  const data = JSON.parse(presetJson);
  fillEmptyConstraints(data);

  const numParticles = data.particles.length;

  // Create terminate function (same as ground truth test)
  function terminate(trajectories) {
    if (trajectories.length === 0) return false;
    var trajectory = trajectories[trajectories.length - 1];
    var projectileY = -trajectory[2 * data.projectile + 1];
    var projectileVY =
      -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
    return projectileY < 0 || projectileVY < 0;
  }

  // Run baseline simulation
  const [baselineTrajectories] = simulate(
    data.particles,
    data.constraints,
    data.timestep,
    data.duration,
    terminate
  );

  // Test multiple perturbations
  const numPerturbations = 5;
  const results = [];

  for (let perturbIdx = 0; perturbIdx < numPerturbations; perturbIdx++) {
    // Create perturbed particles
    const perturbedParticles = data.particles.map(p => ({
      ...p,
      x: p.x + (Math.random() - 0.5) * 2 * perturbationSize,
      y: p.y + (Math.random() - 0.5) * 2 * perturbationSize,
    }));

    // Run perturbed simulation
    const [perturbedTrajectories] = simulate(
      perturbedParticles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );

    // Calculate divergence at each time step
    const minLength = Math.min(baselineTrajectories.length, perturbedTrajectories.length);
    const divergences = [];
    const velocityDivergences = [];

    for (let i = 0; i < minLength; i++) {
      const posDiv = calculateStateDistance(
        baselineTrajectories[i],
        perturbedTrajectories[i],
        numParticles
      );
      const velDiv = calculateVelocityDivergence(
        baselineTrajectories[i],
        perturbedTrajectories[i],
        numParticles
      );
      divergences.push(posDiv);
      velocityDivergences.push(velDiv);
    }

    // Calculate metrics
    const maxDivergence = Math.max(...divergences);
    const finalDivergence = divergences[divergences.length - 1];
    const avgDivergence = divergences.reduce((a, b) => a + b, 0) / divergences.length;

    // Calculate exponential growth rate (simplified Lyapunov exponent)
    // Find where divergence exceeds 10x initial (if it does)
    const initialDiv = divergences[0];
    let growthRate = 0;
    let doubling_time = null;

    if (initialDiv > 1e-10) {
      for (let i = 1; i < divergences.length; i++) {
        if (divergences[i] > 2 * initialDiv && doubling_time === null) {
          doubling_time = i * data.timestep;
        }
      }

      if (finalDivergence > initialDiv && divergences.length > 1) {
        const timeSpan = (divergences.length - 1) * data.timestep;
        growthRate = Math.log(finalDivergence / initialDiv) / timeSpan;
      }
    }

    results.push({
      initialDivergence: initialDiv,
      maxDivergence,
      finalDivergence,
      avgDivergence,
      growthRate,
      doubling_time,
      trajectoryLength: divergences.length,
      finalVelocityDivergence: velocityDivergences[velocityDivergences.length - 1],
    });
  }

  // Aggregate results across perturbations
  const avgMaxDivergence = results.reduce((sum, r) => sum + r.maxDivergence, 0) / results.length;
  const avgFinalDivergence = results.reduce((sum, r) => sum + r.finalDivergence, 0) / results.length;
  const avgGrowthRate = results.reduce((sum, r) => sum + r.growthRate, 0) / results.length;
  const avgDoublingTime = results
    .filter(r => r.doubling_time !== null)
    .reduce((sum, r) => sum + r.doubling_time, 0) /
    Math.max(1, results.filter(r => r.doubling_time !== null).length);

  return {
    presetName,
    perturbationSize,
    numPerturbations,
    avgMaxDivergence,
    avgFinalDivergence,
    avgGrowthRate,
    avgDoublingTime: isNaN(avgDoublingTime) ? null : avgDoublingTime,
    baselineTrajectoryLength: baselineTrajectories.length,
    individualResults: results,
  };
}

test("sensitivity analysis for all presets", () => {
  const sensitivityResults = {};

  // Analyze each preset
  for (const [presetName, presetJson] of Object.entries(presets)) {
    console.log(`\nAnalyzing sensitivity for: ${presetName}`);

    try {
      const result = analyzeSensitivity(presetName, presetJson, 0.01);
      sensitivityResults[presetName] = result;

      console.log(`  Max divergence: ${result.avgMaxDivergence.toFixed(3)}`);
      console.log(`  Final divergence: ${result.avgFinalDivergence.toFixed(3)}`);
      console.log(`  Growth rate: ${result.avgGrowthRate.toFixed(6)}`);
      if (result.avgDoublingTime !== null) {
        console.log(`  Avg doubling time: ${result.avgDoublingTime.toFixed(2)}s`);
      }
    } catch (error) {
      console.error(`  Error analyzing ${presetName}: ${error.message}`);
      sensitivityResults[presetName] = { error: error.message };
    }
  }

  // Generate report
  console.log("\n" + "=".repeat(80));
  console.log("SENSITIVITY ANALYSIS REPORT");
  console.log("=".repeat(80));
  console.log("\nRanked by sensitivity (growth rate):\n");

  const rankedByGrowth = Object.entries(sensitivityResults)
    .filter(([_, result]) => !result.error)
    .sort((a, b) => b[1].avgGrowthRate - a[1].avgGrowthRate);

  rankedByGrowth.forEach(([name, result], idx) => {
    console.log(`${idx + 1}. ${name}`);
    console.log(`   Growth Rate: ${result.avgGrowthRate.toFixed(6)} (divergence per second)`);
    console.log(`   Max Divergence: ${result.avgMaxDivergence.toFixed(3)}`);
    console.log(`   Final Divergence: ${result.avgFinalDivergence.toFixed(3)}`);
    if (result.avgDoublingTime !== null) {
      console.log(`   Doubling Time: ${result.avgDoublingTime.toFixed(2)}s`);
    }
    console.log();
  });

  console.log("\n" + "=".repeat(80));
  console.log("INTERPRETATION:");
  console.log("=".repeat(80));
  console.log("- Growth Rate: How fast trajectories diverge (higher = more sensitive)");
  console.log("- Max Divergence: Maximum position difference during simulation");
  console.log("- Final Divergence: Position difference at end of simulation");
  console.log("- Doubling Time: Time for divergence to double from initial value");
  console.log("\nPresets with higher growth rates are more sensitive to initial conditions.");
  console.log("This indicates potential chaotic behavior in the system.");
  console.log("=".repeat(80));

  // Store results for potential JSON export
  globalThis.sensitivityResults = sensitivityResults;

  // Basic sanity checks
  expect(Object.keys(sensitivityResults).length).toBeGreaterThan(0);

  // All presets should have some measurable divergence
  for (const [name, result] of Object.entries(sensitivityResults)) {
    if (!result.error) {
      expect(result.avgMaxDivergence).toBeGreaterThan(0);
    }
  }
});
