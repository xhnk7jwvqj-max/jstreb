/**
 * Physics utility functions for trebuchet simulation
 * Shared between interface.js and tests
 */

const CONSTRAINT_TYPES = ["rod", "pin", "slider", "colinear", "f2k", "rope"];

/**
 * Fill in missing constraint types with empty arrays
 * @param {Object} data - The simulation data object
 */
export function fillEmptyConstraints(data) {
  for (const ctype of CONSTRAINT_TYPES) {
    if (data.constraints[ctype] === undefined) {
      data.constraints[ctype] = [];
    }
  }
}

/**
 * Normalize constraints by converting duplicate sliders to pin constraints
 * Also fills in any missing constraint types
 * @param {Object} data - The simulation data object (modified in place)
 */
export function normalizeConstraints(data) {
  // First, fill in any missing constraint types
  fillEmptyConstraints(data);

  // Handle pin constraints from sliders
  const sliderCounts = data.particles.map(() => 0);
  data.constraints.slider.forEach((x) => {
    if (!x.oneway) {
      sliderCounts[x.p] += 1;
    }
  });
  data.constraints.slider = data.constraints.slider.filter(
    (x) => sliderCounts[x.p] < 2
  );
  data.constraints.pin = data.constraints.pin.concat(
    sliderCounts
      .flatMap((x, i) => [{ count: x, p: i }])
      .filter((x) => x.count > 1)
  );
}

/**
 * Calculate peak load from force log
 * @param {Array} forceLog - Array of force arrays from simulation
 * @returns {number} Maximum absolute force value
 */
export function calculatePeakLoad(forceLog) {
  return Math.max(
    ...forceLog.slice(1).map((x) => Math.max(...x.map((y) => Math.abs(y))))
  );
}

/**
 * Calculate projectile range from trajectories
 * @param {Array} trajectories - Array of trajectory states
 * @param {Object} data - Simulation data containing particles and indices
 * @returns {number} Calculated range
 */
export function calculateRange(trajectories, data) {
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
          -trajectory[2 * data.particles.length + 2 * data.projectile + 1]
        ) *
        trajectory[2 * data.particles.length + 2 * data.projectile]
    );
  }

  const height1 = axlecoord - mincoord;
  const height2 = Math.sqrt(
    Math.pow(
      data.particles[data.armtip].x - data.particles[data.mainaxle].x,
      2
    ) +
      Math.pow(
        data.particles[data.armtip].y - data.particles[data.projectile].y,
        2
      )
  );
  range = (range / Math.max(height1, 0.75 * height2)) * data.axleheight;

  return range;
}
