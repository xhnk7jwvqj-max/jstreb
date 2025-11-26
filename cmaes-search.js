/**
 * Topology search using CMA-ES with fixed-size encoding
 */

import { FixedEncoding } from "./fixed-encoding.js";
import { CMAES } from "./cmaes.js";
import { evaluateConstrainedTopology } from "./constrained-topology-search.js";

export function searchWithCMAES(options = {}) {
  const {
    numParticles = 8,
    maxEvaluations = 100000,
    maxForce = 15000,
    minMass = 1,
    seed = 12345,
    verbose = true,
  } = options;

  // Initialize encoding
  const encoding = new FixedEncoding(numParticles, {
    posX: [350, 650],
    posY: [350, 650],
    mass: [minMass, 100],
  });

  // Initialize CMA-ES
  let rngSeed = seed;
  function rng() {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  }

  const cmaes = new CMAES(encoding.totalDim, {
    sigma: 0.3,
    lambda: 20, // Population size per generation
  });

  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("CMA-ES TOPOLOGY SEARCH");
    console.log("=".repeat(80));
    console.log(`Particles: ${numParticles} (fixed)`);
    console.log(`Encoding dimension: ${encoding.totalDim}`);
    console.log(`  Binary: ${encoding.numBinary} (rods, pins, sliders)`);
    console.log(`  Continuous: ${encoding.numContinuous} (positions, masses, normals)`);
    console.log(`Population size: ${cmaes.lambda}`);
    console.log(`Max evaluations: ${maxEvaluations}`);
    console.log(`Max force: ${maxForce} lbf`);
    console.log(`Min mass: ${minMass} kg`);
    console.log("=".repeat(80));
  }

  let totalEvaluations = 0;
  let bestEver = null;
  let bestEverFitness = -Infinity;
  const history = [];

  while (totalEvaluations < maxEvaluations) {
    // Sample population
    const population = cmaes.samplePopulation(rng);

    // Evaluate all individuals
    const evaluated = [];
    let validCount = 0;
    const rejectionReasons = {};

    for (const vector of population) {
      // Decode to trebuchet config
      const config = encoding.decode(vector);

      // Evaluate
      const result = evaluateConstrainedTopology(config, maxForce);

      if (result.valid) {
        validCount++;
      } else {
        rejectionReasons[result.reason] = (rejectionReasons[result.reason] || 0) + 1;
      }

      evaluated.push([vector, result.fitness, result]);

      // Track best ever
      if (result.fitness > bestEverFitness) {
        bestEverFitness = result.fitness;
        bestEver = {
          ...result,
          config,
          generation: cmaes.generation,
          evaluation: totalEvaluations,
        };
      }

      totalEvaluations++;

      if (totalEvaluations >= maxEvaluations) {
        break;
      }
    }

    // Update CMA-ES
    const stats = cmaes.update(evaluated);

    // Record history
    history.push({
      generation: cmaes.generation,
      evaluation: totalEvaluations,
      maxFitness: stats.bestFitness,
      avgFitness: stats.meanFitness,
      sigma: stats.sigma,
      validCount,
      rejectionReasons,
    });

    // Verbose output
    if (verbose && cmaes.generation % 10 === 0) {
      const reasons = Object.entries(rejectionReasons).map(([r, c]) => `${r}:${c}`).join(", ");
      console.log(
        `Gen ${cmaes.generation.toString().padStart(4)}: ` +
        `Best=${stats.bestFitness.toFixed(2)}, ` +
        `Avg=${stats.meanFitness.toFixed(2)}, ` +
        `Sigma=${stats.sigma.toFixed(4)}, ` +
        `Valid=${validCount}/${cmaes.lambda}` +
        (reasons ? ` [${reasons}]` : " [all valid]")
      );
    }

    // Early stopping if converged
    if (stats.sigma < 1e-8) {
      if (verbose) {
        console.log(`\nConverged: sigma = ${stats.sigma.toFixed(10)}`);
      }
      break;
    }
  }

  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("CMA-ES SEARCH COMPLETE");
    console.log("=".repeat(80));
    if (bestEver) {
      console.log(`Best fitness: ${bestEver.fitness.toFixed(2)}`);
      console.log(`Best range: ${bestEver.range.toFixed(2)} ft`);
      console.log(`Peak load: ${bestEver.peakLoad.toFixed(2)} lbf`);
      console.log(`Found in generation: ${bestEver.generation}`);
      console.log(`Particles: ${bestEver.numParticles}`);
      console.log(`Constraints: ${bestEver.numConstraints}`);
    } else {
      console.log("No valid solutions found");
    }
    console.log("=".repeat(80));
  }

  return {
    bestEver,
    history,
    totalEvaluations,
    encoding,
    cmaes,
  };
}
