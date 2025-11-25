/**
 * Topology Search Algorithm
 * Searches over constraint graph structures to discover high-performing trebuchet topologies
 */

import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange } from "./trebuchetsimulation.js";

/**
 * Evaluate fitness of a topology
 * @param {Object} config - Trebuchet configuration
 * @returns {Object} Fitness metrics
 */
export function evaluateTopology(config) {
  try {
    fillEmptyConstraints(config);

    // Terminate function
    function terminate(trajectories) {
      if (trajectories.length === 0) return false;
      var trajectory = trajectories[trajectories.length - 1];
      var projectileY = -trajectory[2 * config.projectile + 1];
      var projectileVY =
        -trajectory[2 * config.particles.length + 2 * config.projectile + 1];
      return projectileY < 0 || projectileVY < 0;
    }

    const [trajectories] = simulate(
      config.particles,
      config.constraints,
      config.timestep,
      config.duration,
      terminate
    );

    if (trajectories.length === 0) {
      return { fitness: 0, range: 0, valid: false };
    }

    const range = calculateRange(trajectories, config);

    if (isNaN(range) || !isFinite(range) || range < 0) {
      return { fitness: 0, range: 0, valid: false };
    }

    return {
      fitness: range,
      range: range,
      valid: true,
      numParticles: config.particles.length,
      numConstraints:
        (config.constraints.rod?.length || 0) +
        (config.constraints.slider?.length || 0) +
        (config.constraints.pin?.length || 0),
    };
  } catch (error) {
    return { fitness: 0, range: 0, valid: false, error: error.message };
  }
}

/**
 * Mutation operators for topology evolution
 */

/**
 * Add a random particle
 */
function mutateAddParticle(config, rng) {
  const baseX = 500;
  const baseY = 500;
  const range = 200;

  config.particles.push({
    x: baseX + (rng() - 0.5) * range * 2,
    y: baseY + (rng() - 0.5) * range * 2,
    mass: 1 + rng() * 99,
  });

  return config;
}

/**
 * Remove a random particle (if safe)
 */
function mutateRemoveParticle(config, rng) {
  if (config.particles.length <= 4) return config; // Keep minimum particles

  const toRemove = Math.floor(rng() * config.particles.length);

  // Don't remove special particles
  if (
    toRemove === config.mainaxle ||
    toRemove === config.projectile ||
    toRemove === config.armtip
  ) {
    return config;
  }

  // Remove constraints referencing this particle
  config.constraints.rod = (config.constraints.rod || []).filter(
    (r) => r.p1 !== toRemove && r.p2 !== toRemove
  );
  config.constraints.slider = (config.constraints.slider || []).filter(
    (s) => s.p !== toRemove
  );
  config.constraints.pin = (config.constraints.pin || []).filter(
    (p) => p.p !== toRemove
  );

  // Adjust indices
  config.particles.splice(toRemove, 1);

  const adjustIndex = (idx) => (idx > toRemove ? idx - 1 : idx);

  config.mainaxle = adjustIndex(config.mainaxle);
  config.projectile = adjustIndex(config.projectile);
  config.armtip = adjustIndex(config.armtip);

  config.constraints.rod = (config.constraints.rod || []).map((r) => ({
    ...r,
    p1: adjustIndex(r.p1),
    p2: adjustIndex(r.p2),
  }));
  config.constraints.slider = (config.constraints.slider || []).map((s) => ({
    ...s,
    p: adjustIndex(s.p),
  }));
  config.constraints.pin = (config.constraints.pin || []).map((p) => ({
    ...p,
    p: adjustIndex(p.p),
  }));

  return config;
}

/**
 * Add a random rod constraint
 */
function mutateAddRod(config, rng) {
  if (config.particles.length < 2) return config;

  const p1 = Math.floor(rng() * config.particles.length);
  let p2 = Math.floor(rng() * config.particles.length);
  while (p2 === p1 && config.particles.length > 1) {
    p2 = Math.floor(rng() * config.particles.length);
  }

  // Check if rod already exists
  const exists = (config.constraints.rod || []).some(
    (r) => (r.p1 === p1 && r.p2 === p2) || (r.p1 === p2 && r.p2 === p1)
  );

  if (!exists) {
    if (!config.constraints.rod) config.constraints.rod = [];
    const rod = { p1, p2 };
    if (rng() < 0.1) rod.oneway = true; // 10% chance of oneway
    config.constraints.rod.push(rod);
  }

  return config;
}

/**
 * Remove a random rod constraint
 */
function mutateRemoveRod(config, rng) {
  if (!config.constraints.rod || config.constraints.rod.length === 0)
    return config;

  const idx = Math.floor(rng() * config.constraints.rod.length);
  config.constraints.rod.splice(idx, 1);

  return config;
}

/**
 * Add a random slider constraint
 */
function mutateAddSlider(config, rng) {
  if (config.particles.length === 0) return config;

  const p = Math.floor(rng() * config.particles.length);
  const angle = rng() * 2 * Math.PI;
  const normal = { x: Math.cos(angle), y: Math.sin(angle) };

  if (!config.constraints.slider) config.constraints.slider = [];

  const slider = { p, normal };
  if (rng() < 0.15) slider.oneway = true;

  config.constraints.slider.push(slider);

  return config;
}

/**
 * Remove a random slider
 */
function mutateRemoveSlider(config, rng) {
  if (!config.constraints.slider || config.constraints.slider.length === 0)
    return config;

  const idx = Math.floor(rng() * config.constraints.slider.length);
  config.constraints.slider.splice(idx, 1);

  return config;
}

/**
 * Modify a particle's position
 */
function mutateParticlePosition(config, rng) {
  if (config.particles.length === 0) return config;

  const idx = Math.floor(rng() * config.particles.length);
  const amount = 20;

  config.particles[idx].x += (rng() - 0.5) * amount;
  config.particles[idx].y += (rng() - 0.5) * amount;

  return config;
}

/**
 * Modify a particle's mass
 */
function mutateParticleMass(config, rng) {
  if (config.particles.length === 0) return config;

  const idx = Math.floor(rng() * config.particles.length);

  config.particles[idx].mass *= 0.7 + rng() * 0.6; // 0.7x to 1.3x
  config.particles[idx].mass = Math.max(0.1, config.particles[idx].mass);

  return config;
}

/**
 * Apply random mutation to topology
 */
export function mutateTopology(config, rng, mutationRate = 0.3) {
  // Deep copy
  config = JSON.parse(JSON.stringify(config));

  const mutations = [
    mutateAddParticle,
    mutateRemoveParticle,
    mutateAddRod,
    mutateRemoveRod,
    mutateAddSlider,
    mutateRemoveSlider,
    mutateParticlePosition,
    mutateParticleMass,
  ];

  // Apply random number of mutations
  const numMutations = 1 + Math.floor(rng() * 3); // 1-3 mutations

  for (let i = 0; i < numMutations; i++) {
    if (rng() < mutationRate) {
      const mutation = mutations[Math.floor(rng() * mutations.length)];
      config = mutation(config, rng);
    }
  }

  return config;
}

/**
 * Create initial population with some basic structure
 */
export function createInitialPopulation(size, seed = 12345) {
  let rngSeed = seed;
  function rng() {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  }

  const population = [];

  for (let i = 0; i < size; i++) {
    // Create a basic configuration with potential
    const numParticles = 4 + Math.floor(rng() * 5); // 4-8 particles

    const baseX = 500;
    const baseY = 500;
    const range = 150;

    const particles = [];
    for (let j = 0; j < numParticles; j++) {
      particles.push({
        x: baseX + (rng() - 0.5) * range * 2,
        y: baseY + (rng() - 0.5) * range * 2,
        mass: 1 + rng() * 199,
      });
    }

    // Designate special particles
    const mainaxle = 0;
    const projectile = Math.min(numParticles - 1, 3);
    const armtip = Math.min(numParticles - 2, 1);

    // Create some random constraints
    const constraints = {
      rod: [],
      slider: [],
      pin: [],
    };

    // Add some random rods
    const numRods = Math.floor(numParticles * 0.8);
    for (let j = 0; j < numRods; j++) {
      const p1 = Math.floor(rng() * numParticles);
      let p2 = Math.floor(rng() * numParticles);
      while (p2 === p1) {
        p2 = Math.floor(rng() * numParticles);
      }

      const exists = constraints.rod.some(
        (r) => (r.p1 === p1 && r.p2 === p2) || (r.p1 === p2 && r.p2 === p1)
      );

      if (!exists) {
        constraints.rod.push({ p1, p2 });
      }
    }

    // Add some sliders
    if (rng() < 0.8) {
      constraints.slider.push({ p: mainaxle, normal: { x: 0, y: 1 } });
    }

    if (rng() < 0.5) {
      const angle = rng() * 2 * Math.PI;
      constraints.slider.push({
        p: projectile,
        normal: { x: Math.cos(angle), y: Math.sin(angle) },
        oneway: true,
      });
    }

    population.push({
      projectile,
      mainaxle,
      armtip,
      axleheight: 8,
      timestep: 0.3,
      duration: 35,
      particles,
      constraints,
    });
  }

  return population;
}

/**
 * Run genetic algorithm for topology search
 */
export function searchTopologies(options = {}) {
  const {
    populationSize = 50,
    generations = 30,
    eliteCount = 5,
    mutationRate = 0.3,
    seed = 54321,
    verbose = true,
  } = options;

  let rngSeed = seed;
  function rng() {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  }

  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("TOPOLOGY SEARCH VIA GENETIC ALGORITHM");
    console.log("=".repeat(80));
    console.log(`Population: ${populationSize}`);
    console.log(`Generations: ${generations}`);
    console.log(`Elite count: ${eliteCount}`);
    console.log(`Mutation rate: ${mutationRate}`);
    console.log("=".repeat(80));
  }

  // Create initial population
  let population = createInitialPopulation(populationSize, seed);

  const history = [];
  let bestEver = null;

  for (let gen = 0; gen < generations; gen++) {
    // Evaluate fitness
    const evaluated = population.map((config, idx) => ({
      config,
      idx,
      ...evaluateTopology(config),
    }));

    // Sort by fitness
    evaluated.sort((a, b) => b.fitness - a.fitness);

    // Track best
    if (!bestEver || evaluated[0].fitness > bestEver.fitness) {
      bestEver = JSON.parse(JSON.stringify(evaluated[0]));
      bestEver.generation = gen;
    }

    // Statistics
    const validCount = evaluated.filter((e) => e.valid).length;
    const avgFitness = evaluated.reduce((sum, e) => sum + e.fitness, 0) / populationSize;
    const maxFitness = evaluated[0].fitness;

    history.push({
      generation: gen,
      maxFitness,
      avgFitness,
      validCount,
      bestConfig: JSON.parse(JSON.stringify(evaluated[0].config)),
    });

    if (verbose && gen % 5 === 0) {
      console.log(
        `Gen ${gen}: Best=${maxFitness.toFixed(2)}, Avg=${avgFitness.toFixed(2)}, Valid=${validCount}/${populationSize}`
      );
    }

    // Create next generation
    const nextGeneration = [];

    // Keep elite
    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push(JSON.parse(JSON.stringify(evaluated[i].config)));
    }

    // Fill rest with mutations of top performers
    while (nextGeneration.length < populationSize) {
      // Select parent from top 50%
      const parentIdx = Math.floor(rng() * Math.floor(populationSize / 2));
      const parent = evaluated[parentIdx].config;

      // Mutate
      const offspring = mutateTopology(parent, rng, mutationRate);
      nextGeneration.push(offspring);
    }

    population = nextGeneration;
  }

  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("SEARCH COMPLETE");
    console.log("=".repeat(80));
    console.log(`Best fitness: ${bestEver.fitness.toFixed(2)}`);
    console.log(`Best range: ${bestEver.range.toFixed(2)}`);
    console.log(`Found in generation: ${bestEver.generation}`);
    console.log(`Particles: ${bestEver.numParticles}`);
    console.log(`Constraints: ${bestEver.numConstraints}`);
    console.log("=".repeat(80));
  }

  return {
    bestEver,
    history,
    finalPopulation: population,
  };
}
