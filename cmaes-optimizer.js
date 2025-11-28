import { sampleGaussian, calculateMean, calculateCovariance, randn, choleskyDecomposition } from "./gaussian.js";

/**
 * CMA-ES-like optimizer for continuous parameter optimization
 *
 * @param {Object} options - Configuration options
 * @param {Array<number>} options.initialConfig - Initial parameter configuration
 * @param {Function} options.objectiveFunction - Function that takes config array and returns score (higher is better)
 * @param {Function} options.shouldStop - Function that returns true when optimization should stop
 * @param {Function} options.onImprovement - Optional callback when improvement is found: (config, score) => void
 * @param {number} options.initialStepSize - Initial random step size (default: 0.6)
 * @param {number} options.populationMultiplier - Population size as multiple of config length (default: 25)
 * @param {number} options.improvementCheckInterval - How often to check for improvement (default: every iteration)
 * @returns {Promise<Array<number>>} - Best configuration found
 */
export async function optimizeCMAES(options) {
  const {
    initialConfig,
    objectiveFunction,
    shouldStop,
    onImprovement = null,
    initialStepSize = 0.6,
    populationMultiplier = 25,
    improvementCheckInterval = 1,
  } = options;

  let config = [...initialConfig];
  let topCandidates = [];
  let timer = 0;
  const populationSize = populationMultiplier * config.length;

  while (!shouldStop()) {
    let newConfig;

    // Phase 1: Random exploration
    // Phase 2: CMA-ES-like sampling from fitted Gaussian
    if (timer > populationSize) {
      // Use top candidates to fit Gaussian distribution
      topCandidates = topCandidates.slice(0, populationSize);
      const population = topCandidates.map((pair) => pair[1]);

      const mean = calculateMean(population);
      const covariance = calculateCovariance(population, mean);
      const L = choleskyDecomposition(covariance);
      newConfig = sampleGaussian(config, L);
    } else {
      // Random exploration phase
      newConfig = config.map((el) => el + randn() * initialStepSize);
    }

    // Evaluate new configuration
    const score = objectiveFunction(newConfig);
    timer += 1;
    topCandidates.push([score, newConfig]);

    // Check if this is an improvement
    const isImprovement = timer % improvementCheckInterval === 1 ||
                          (topCandidates.length > 0 && score > topCandidates[0][0]);

    if (isImprovement && onImprovement) {
      await onImprovement(newConfig, score);
    }

    // Sort candidates by score (descending - higher is better)
    topCandidates = topCandidates.sort((a, b) => b[0] - a[0]);
    config = topCandidates[0][1];
  }

  return config;
}

/**
 * Simpler random walk optimizer (hill climbing with step size annealing)
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getConfig - Function that returns current config as array
 * @param {Function} options.setConfig - Function that sets config from array
 * @param {Function} options.mutateInPlace - Function that mutates config in place with given step size
 * @param {Function} options.objectiveFunction - Function that returns score (higher is better)
 * @param {Function} options.shouldStop - Function that returns true when optimization should stop
 * @param {Function} options.onImprovement - Optional callback when improvement is found
 * @param {number} options.initialStepSize - Initial step size (default: 9)
 * @param {number} options.stepDecayFactor - Step size decay factor (default: 0.6)
 * @param {number} options.timeoutSteps - Steps before reducing step size (default: 500)
 * @param {number} options.improveCheckInterval - How often to check for async updates (default: 20)
 * @returns {Promise<void>}
 */
export async function optimizeRandomWalk(options) {
  const {
    getConfig,
    setConfig,
    mutateInPlace,
    objectiveFunction,
    shouldStop,
    onImprovement = null,
    initialStepSize = 9,
    stepDecayFactor = 0.6,
    timeoutSteps = 500,
    improveCheckInterval = 20,
  } = options;

  let stepSize = initialStepSize;
  let timer = timeoutSteps;
  let bestScore = objectiveFunction();

  while (!shouldStop()) {
    const oldConfig = getConfig();

    // Mutate configuration
    mutateInPlace(stepSize);

    // Evaluate
    const newScore = objectiveFunction();

    // Occasionally allow UI updates
    if (timer % improveCheckInterval === 0 && onImprovement) {
      await onImprovement();
    }

    // Accept or reject
    if (newScore > bestScore) {
      // Accept: keep new configuration
      timer = timeoutSteps;
      bestScore = newScore;
      if (onImprovement) {
        await onImprovement();
      }
    } else {
      // Reject: restore old configuration
      setConfig(oldConfig);
      timer -= 1;
      if (timer === 0) {
        timer = timeoutSteps;
        stepSize *= stepDecayFactor;
      }
    }
  }
}
