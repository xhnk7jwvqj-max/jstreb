/**
 * Shared trebuchet simulation utilities
 */

const ctypes = ["rod", "pin", "slider", "colinear", "f2k", "rope"];

/**
 * Fill in missing constraint types and handle pin constraints from sliders
 * @param {Object} data - The trebuchet data object
 */
export function fillEmptyConstraints(data) {
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
    (x) => sliderCounts[x.p] < 2
  );
  data.constraints.pin = data.constraints.pin.concat(
    sliderCounts
      .flatMap((x, i) => [{ count: x, p: i }])
      .filter((x) => x.count > 1)
  );
}

/**
 * Calculate the peak load from force log
 * @param {Array} forceLog - The force log from simulation
 * @returns {number} The peak load
 */
export function calculatePeakLoad(forceLog) {
  return Math.max(
    ...forceLog.slice(1).map((x) => Math.max(...x.map((y) => Math.abs(y))))
  );
}

/**
 * Calculate the range from trajectories
 * @param {Array} trajectories - The trajectories from simulation
 * @param {Object} data - The trebuchet data object containing particles and configuration
 * @returns {number} The calculated range
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
