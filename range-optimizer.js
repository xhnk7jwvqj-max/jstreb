/**
 * Range Optimization for Trebuchet Configurations
 * Uses coordinate descent to optimize initial particle positions for maximum range
 */

import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange } from "./trebuchetsimulation.js";

/**
 * Calculate range for a given configuration
 * @param {Object} data - Trebuchet configuration
 * @returns {number} Range achieved, or -1 if simulation failed
 */
function evaluateRange(data) {
  try {
    // Create terminate function
    function terminate(trajectories) {
      if (trajectories.length === 0) return false;
      var trajectory = trajectories[trajectories.length - 1];
      var projectileY = -trajectory[2 * data.projectile + 1];
      var projectileVY =
        -trajectory[2 * data.particles.length + 2 * data.projectile + 1];
      return projectileY < 0 || projectileVY < 0;
    }

    const [trajectories] = simulate(
      data.particles,
      data.constraints,
      data.timestep,
      data.duration,
      terminate
    );

    if (trajectories.length === 0) {
      return -1;
    }

    const range = calculateRange(trajectories, data);
    return isNaN(range) || !isFinite(range) ? -1 : range;
  } catch (error) {
    return -1;
  }
}

/**
 * Optimize trebuchet configuration for maximum range
 * @param {Object} initialData - Initial trebuchet configuration
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized configuration and metrics
 */
export function optimizeRange(initialData, options = {}) {
  const {
    maxIterations = 50,
    stepSize = 2.0,
    convergenceThreshold = 0.1,
    verboseLogging = false,
  } = options;

  // Deep copy initial data
  let bestData = JSON.parse(JSON.stringify(initialData));
  fillEmptyConstraints(bestData);

  let bestRange = evaluateRange(bestData);
  const initialRange = bestRange;

  if (verboseLogging) {
    console.log(`Initial range: ${bestRange.toFixed(2)}`);
  }

  if (bestRange < 0) {
    return {
      success: false,
      initialRange: 0,
      finalRange: 0,
      improvement: 0,
      iterations: 0,
      optimizedConfig: initialData,
    };
  }

  let iteration = 0;
  let noImprovementCount = 0;
  const maxNoImprovement = 10;

  // Parameters to optimize: particle x and y positions (except fixed axle)
  // We'll also try varying masses slightly

  while (iteration < maxIterations && noImprovementCount < maxNoImprovement) {
    iteration++;
    let improved = false;

    // Try adjusting each particle position
    for (let particleIdx = 0; particleIdx < bestData.particles.length; particleIdx++) {
      // Skip the main axle for position optimization
      if (particleIdx === bestData.mainaxle) continue;

      const originalX = bestData.particles[particleIdx].x;
      const originalY = bestData.particles[particleIdx].y;

      // Try moving in each direction
      const directions = [
        { dx: stepSize, dy: 0 },
        { dx: -stepSize, dy: 0 },
        { dx: 0, dy: stepSize },
        { dx: 0, dy: -stepSize },
      ];

      for (const { dx, dy } of directions) {
        bestData.particles[particleIdx].x = originalX + dx;
        bestData.particles[particleIdx].y = originalY + dy;

        const newRange = evaluateRange(bestData);

        if (newRange > bestRange + convergenceThreshold) {
          bestRange = newRange;
          improved = true;
          if (verboseLogging) {
            console.log(
              `  Iteration ${iteration}: Improved range to ${bestRange.toFixed(2)} (particle ${particleIdx} ${dx > 0 ? '+x' : dx < 0 ? '-x' : dy > 0 ? '+y' : '-y'})`
            );
          }
          break; // Keep this improvement and move to next particle
        } else {
          // Revert change
          bestData.particles[particleIdx].x = originalX;
          bestData.particles[particleIdx].y = originalY;
        }
      }
    }

    // Try adjusting masses (less aggressively)
    for (let particleIdx = 0; particleIdx < bestData.particles.length; particleIdx++) {
      // Skip axle
      if (particleIdx === bestData.mainaxle) continue;

      const originalMass = bestData.particles[particleIdx].mass;

      // Try small mass adjustments
      const massMultipliers = [1.1, 0.9];

      for (const multiplier of massMultipliers) {
        const newMass = originalMass * multiplier;
        if (newMass < 0.1) continue; // Don't make masses too small

        bestData.particles[particleIdx].mass = newMass;

        const newRange = evaluateRange(bestData);

        if (newRange > bestRange + convergenceThreshold) {
          bestRange = newRange;
          improved = true;
          if (verboseLogging) {
            console.log(
              `  Iteration ${iteration}: Improved range to ${bestRange.toFixed(2)} (mass ${particleIdx} ${multiplier > 1 ? '+' : '-'})`
            );
          }
          break;
        } else {
          // Revert
          bestData.particles[particleIdx].mass = originalMass;
        }
      }
    }

    if (!improved) {
      noImprovementCount++;
      // Reduce step size when stuck
      if (noImprovementCount % 3 === 0) {
        // Don't modify stepSize in outer scope, just note we're stuck
      }
    } else {
      noImprovementCount = 0;
    }
  }

  if (verboseLogging) {
    console.log(
      `Optimization complete after ${iteration} iterations: ${initialRange.toFixed(2)} -> ${bestRange.toFixed(2)}`
    );
  }

  return {
    success: true,
    initialRange,
    finalRange: bestRange,
    improvement: bestRange - initialRange,
    improvementPercent: ((bestRange - initialRange) / initialRange) * 100,
    iterations: iteration,
    optimizedConfig: bestData,
  };
}

/**
 * Quick range evaluation (for sensitivity analysis)
 * @param {Object} data - Trebuchet configuration
 * @returns {number} Range
 */
export function quickEvaluateRange(data) {
  fillEmptyConstraints(data);
  return evaluateRange(data);
}
