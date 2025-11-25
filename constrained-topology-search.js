/**
 * Constrained Topology Search
 * Searches with force limits and energy conservation constraints
 */

import { simulate } from "./simulate.js";
import { fillEmptyConstraints, calculateRange, calculatePeakLoad } from "./trebuchetsimulation.js";

/**
 * Calculate total energy (kinetic + potential)
 */
function calculateEnergy(state, masses) {
  const numParticles = masses.length;
  let kineticEnergy = 0;
  let potentialEnergy = 0;
  const g = 1; // gravity magnitude

  for (let i = 0; i < numParticles; i++) {
    const mass = masses[i];
    const y = -state[2 * i + 1];
    const vx = state[2 * numParticles + 2 * i];
    const vy = state[2 * numParticles + 2 * i + 1];
    const vSquared = vx * vx + vy * vy;

    kineticEnergy += 0.5 * mass * vSquared;
    potentialEnergy += mass * g * y;
  }

  return kineticEnergy + potentialEnergy;
}

/**
 * Evaluate fitness with force and energy constraints
 */
export function evaluateConstrainedTopology(config, maxForce = 15000) {
  try {
    fillEmptyConstraints(config);

    function terminate(trajectories) {
      if (trajectories.length === 0) return false;
      var trajectory = trajectories[trajectories.length - 1];
      var projectileY = -trajectory[2 * config.projectile + 1];
      var projectileVY =
        -trajectory[2 * config.particles.length + 2 * config.projectile + 1];
      return projectileY < 0 || projectileVY < 0;
    }

    const [trajectories, constraintLog, forceLog] = simulate(
      config.particles,
      config.constraints,
      config.timestep,
      config.duration,
      terminate
    );

    if (trajectories.length === 0) {
      return { fitness: 0, range: 0, valid: false, reason: "simulation_failed" };
    }

    const range = calculateRange(trajectories, config);

    if (isNaN(range) || !isFinite(range) || range < 0) {
      return { fitness: 0, range: 0, valid: false, reason: "invalid_range" };
    }

    // Check peak force
    const peakLoad = calculatePeakLoad(forceLog);
    if (peakLoad > maxForce) {
      return {
        fitness: 0,
        range: range,
        peakLoad: peakLoad,
        valid: false,
        reason: "force_exceeded",
      };
    }

    // Check energy conservation
    const masses = config.particles.map((p) => p.mass);
    const energies = trajectories.map((state) => calculateEnergy(state, masses));
    const initialEnergy = energies[0];
    const tolerance = Math.abs(initialEnergy) * 0.05; // 5% tolerance

    let energyConserved = true;
    for (let i = 0; i < energies.length; i++) {
      const energyDifference = Math.abs(energies[i] - initialEnergy);
      if (energyDifference > tolerance) {
        energyConserved = false;
        break;
      }
    }

    if (!energyConserved) {
      return {
        fitness: 0,
        range: range,
        peakLoad: peakLoad,
        valid: false,
        reason: "energy_not_conserved",
      };
    }

    // All constraints satisfied!
    return {
      fitness: range,
      range: range,
      peakLoad: peakLoad,
      valid: true,
      energyConserved: true,
      numParticles: config.particles.length,
      numConstraints:
        (config.constraints.rod?.length || 0) +
        (config.constraints.slider?.length || 0) +
        (config.constraints.pin?.length || 0),
    };
  } catch (error) {
    return { fitness: 0, range: 0, valid: false, error: error.message, reason: "exception" };
  }
}

/**
 * Mutation operators with minimum mass constraint
 */

function mutateAddParticle(config, rng, minMass = 1) {
  const baseX = 500;
  const baseY = 500;
  const range = 200;

  config.particles.push({
    x: baseX + (rng() - 0.5) * range * 2,
    y: baseY + (rng() - 0.5) * range * 2,
    mass: minMass + rng() * 99, // minMass to minMass+99
  });

  return config;
}

function mutateRemoveParticle(config, rng) {
  if (config.particles.length <= 4) return config;

  const toRemove = Math.floor(rng() * config.particles.length);

  if (
    toRemove === config.mainaxle ||
    toRemove === config.projectile ||
    toRemove === config.armtip
  ) {
    return config;
  }

  config.constraints.rod = (config.constraints.rod || []).filter(
    (r) => r.p1 !== toRemove && r.p2 !== toRemove
  );
  config.constraints.slider = (config.constraints.slider || []).filter(
    (s) => s.p !== toRemove
  );
  config.constraints.pin = (config.constraints.pin || []).filter(
    (p) => p.p !== toRemove
  );

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

function mutateAddRod(config, rng) {
  if (config.particles.length < 2) return config;

  const p1 = Math.floor(rng() * config.particles.length);
  let p2 = Math.floor(rng() * config.particles.length);
  while (p2 === p1 && config.particles.length > 1) {
    p2 = Math.floor(rng() * config.particles.length);
  }

  const exists = (config.constraints.rod || []).some(
    (r) => (r.p1 === p1 && r.p2 === p2) || (r.p1 === p2 && r.p2 === p1)
  );

  if (!exists) {
    if (!config.constraints.rod) config.constraints.rod = [];
    const rod = { p1, p2 };
    if (rng() < 0.1) rod.oneway = true;
    config.constraints.rod.push(rod);
  }

  return config;
}

function mutateRemoveRod(config, rng) {
  if (!config.constraints.rod || config.constraints.rod.length === 0)
    return config;

  const idx = Math.floor(rng() * config.constraints.rod.length);
  config.constraints.rod.splice(idx, 1);

  return config;
}

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

function mutateRemoveSlider(config, rng) {
  if (!config.constraints.slider || config.constraints.slider.length === 0)
    return config;

  const idx = Math.floor(rng() * config.constraints.slider.length);
  config.constraints.slider.splice(idx, 1);

  return config;
}

function mutateParticlePosition(config, rng) {
  if (config.particles.length === 0) return config;

  const idx = Math.floor(rng() * config.particles.length);
  const amount = 20;

  config.particles[idx].x += (rng() - 0.5) * amount;
  config.particles[idx].y += (rng() - 0.5) * amount;

  return config;
}

function mutateParticleMass(config, rng, minMass = 1) {
  if (config.particles.length === 0) return config;

  const idx = Math.floor(rng() * config.particles.length);

  config.particles[idx].mass *= 0.7 + rng() * 0.6; // 0.7x to 1.3x
  config.particles[idx].mass = Math.max(minMass, config.particles[idx].mass);

  return config;
}

export function mutateTopology(config, rng, mutationRate = 0.3, minMass = 1) {
  config = JSON.parse(JSON.stringify(config));

  const mutations = [
    (c, r) => mutateAddParticle(c, r, minMass),
    mutateRemoveParticle,
    mutateAddRod,
    mutateRemoveRod,
    mutateAddSlider,
    mutateRemoveSlider,
    mutateParticlePosition,
    (c, r) => mutateParticleMass(c, r, minMass),
  ];

  const numMutations = 1 + Math.floor(rng() * 3);

  for (let i = 0; i < numMutations; i++) {
    if (rng() < mutationRate) {
      const mutation = mutations[Math.floor(rng() * mutations.length)];
      config = mutation(config, rng);
    }
  }

  return config;
}

export function createInitialPopulation(size, seed = 12345, minMass = 1) {
  let rngSeed = seed;
  function rng() {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  }

  const population = [];

  for (let i = 0; i < size; i++) {
    const numParticles = 4 + Math.floor(rng() * 5);

    const baseX = 500;
    const baseY = 500;
    const range = 150;

    const particles = [];
    for (let j = 0; j < numParticles; j++) {
      particles.push({
        x: baseX + (rng() - 0.5) * range * 2,
        y: baseY + (rng() - 0.5) * range * 2,
        mass: minMass + rng() * 199, // minMass to minMass+199
      });
    }

    const mainaxle = 0;
    const projectile = Math.min(numParticles - 1, 3);
    const armtip = Math.min(numParticles - 2, 1);

    const constraints = {
      rod: [],
      slider: [],
      pin: [],
    };

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

export function searchConstrainedTopologies(options = {}) {
  const {
    populationSize = 100,
    generations = 1000,
    eliteCount = 10,
    mutationRate = 0.3,
    seed = 54321,
    maxForce = 15000,
    minMass = 1,
    verbose = true,
  } = options;

  let rngSeed = seed;
  function rng() {
    rngSeed = (rngSeed * 9301 + 49297) % 233280;
    return rngSeed / 233280;
  }

  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("CONSTRAINED TOPOLOGY SEARCH");
    console.log("=".repeat(80));
    console.log(`Population: ${populationSize}`);
    console.log(`Generations: ${generations}`);
    console.log(`Max Force: ${maxForce} lbf`);
    console.log(`Min Mass: ${minMass} kg`);
    console.log(`Energy conservation: Required (5% tolerance)`);
    console.log("=".repeat(80));
  }

  let population = createInitialPopulation(populationSize, seed, minMass);

  const history = [];
  let bestEver = null;

  for (let gen = 0; gen < generations; gen++) {
    const evaluated = population.map((config, idx) => ({
      config,
      idx,
      ...evaluateConstrainedTopology(config, maxForce),
    }));

    evaluated.sort((a, b) => b.fitness - a.fitness);

    if (!bestEver || evaluated[0].fitness > bestEver.fitness) {
      bestEver = JSON.parse(JSON.stringify(evaluated[0]));
      bestEver.generation = gen;
    }

    const validCount = evaluated.filter((e) => e.valid).length;
    const avgFitness =
      evaluated.reduce((sum, e) => sum + e.fitness, 0) / populationSize;
    const maxFitness = evaluated[0].fitness;

    // Count rejection reasons
    const rejectionReasons = {};
    evaluated.filter(e => !e.valid).forEach(e => {
      const reason = e.reason || 'unknown';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
    });

    history.push({
      generation: gen,
      maxFitness,
      avgFitness,
      validCount,
      rejectionReasons,
      bestConfig: JSON.parse(JSON.stringify(evaluated[0].config)),
    });

    if (verbose && gen % 5 === 0) {
      const reasons = Object.entries(rejectionReasons).map(([r, c]) => `${r}:${c}`).join(', ');
      console.log(
        `Gen ${gen}: Best=${maxFitness.toFixed(2)}, Avg=${avgFitness.toFixed(2)}, Valid=${validCount}/${populationSize} [${reasons || 'all valid'}]`
      );
    }

    const nextGeneration = [];

    for (let i = 0; i < eliteCount; i++) {
      nextGeneration.push(JSON.parse(JSON.stringify(evaluated[i].config)));
    }

    while (nextGeneration.length < populationSize) {
      const parentIdx = Math.floor(rng() * Math.floor(populationSize / 2));
      const parent = evaluated[parentIdx].config;

      const offspring = mutateTopology(parent, rng, mutationRate, minMass);
      nextGeneration.push(offspring);
    }

    population = nextGeneration;
  }

  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("SEARCH COMPLETE");
    console.log("=".repeat(80));
    if (bestEver && bestEver.fitness > 0) {
      console.log(`Best fitness: ${bestEver.fitness.toFixed(2)}`);
      console.log(`Best range: ${bestEver.range.toFixed(2)}`);
      console.log(`Peak load: ${bestEver.peakLoad.toFixed(2)} lbf`);
      console.log(`Found in generation: ${bestEver.generation}`);
      console.log(`Particles: ${bestEver.numParticles}`);
      console.log(`Constraints: ${bestEver.numConstraints}`);
    } else {
      console.log(`No valid solutions found within constraints!`);
    }
    console.log("=".repeat(80));
  }

  return {
    bestEver,
    history,
    finalPopulation: population,
  };
}
