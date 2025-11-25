/**
 * Truly Random Trebuchet Topology Generator
 * Creates arbitrary constraint topologies NOT based on known designs
 * This tests whether optimization-induced stabilization is topology-specific
 */

/**
 * Generate a completely arbitrary trebuchet topology
 * No assumptions about mechanical type or design pattern
 * @param {number} seed - Random seed for reproducibility
 * @param {Object} options - Generation options
 * @returns {Object} Trebuchet configuration
 */
export function generateArbitraryTrebuchet(seed = Math.random(), options = {}) {
  const {
    minParticles = 5,
    maxParticles = 10,
    rodProbability = 0.3,
    sliderProbability = 0.2,
    pinProbability = 0.1,
    allowRope = false, // Ropes are complex, disable by default
  } = options;

  // Seeded random number generator
  let randomSeed = seed * 10000;
  function rng() {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  }

  // Random number of particles
  const numParticles = minParticles + Math.floor(rng() * (maxParticles - minParticles + 1));

  // Generate random particles in a reasonable spatial region
  const baseX = 500;
  const baseY = 500;
  const spatialRange = 200;

  const particles = [];
  for (let i = 0; i < numParticles; i++) {
    particles.push({
      x: baseX + (rng() - 0.5) * spatialRange * 2,
      y: baseY + (rng() - 0.5) * spatialRange * 2,
      mass: 1 + rng() * 199, // Random mass 1-200
    });
  }

  // Designate special particles randomly
  const mainaxle = Math.floor(rng() * numParticles);
  let projectile = Math.floor(rng() * numParticles);
  while (projectile === mainaxle) {
    projectile = Math.floor(rng() * numParticles);
  }
  let armtip = Math.floor(rng() * numParticles);
  while (armtip === mainaxle || armtip === projectile) {
    armtip = Math.floor(rng() * numParticles);
  }

  const constraints = {
    rod: [],
    slider: [],
    pin: [],
    colinear: [],
    f2k: [],
    rope: [],
  };

  // Generate random rod constraints
  // Connect pairs of particles randomly
  const maxRods = Math.floor(numParticles * 1.5); // Limit total rods
  for (let attempt = 0; attempt < maxRods; attempt++) {
    if (rng() < rodProbability) {
      const p1 = Math.floor(rng() * numParticles);
      let p2 = Math.floor(rng() * numParticles);
      while (p2 === p1) {
        p2 = Math.floor(rng() * numParticles);
      }

      // Check if this rod already exists
      const exists = constraints.rod.some(
        (r) => (r.p1 === p1 && r.p2 === p2) || (r.p1 === p2 && r.p2 === p1)
      );

      if (!exists) {
        const constraint = { p1, p2 };
        // Randomly add oneway property
        if (rng() < 0.1) {
          constraint.oneway = true;
        }
        constraints.rod.push(constraint);
      }
    }
  }

  // Generate random slider constraints
  const maxSliders = Math.floor(numParticles * 0.8);
  for (let attempt = 0; attempt < maxSliders; attempt++) {
    if (rng() < sliderProbability) {
      const p = Math.floor(rng() * numParticles);

      // Random normal direction
      const angle = rng() * 2 * Math.PI;
      const normal = {
        x: Math.cos(angle),
        y: Math.sin(angle),
      };

      const constraint = { p, normal };
      // Randomly add oneway property (for projectile release-like behavior)
      if (rng() < 0.15) {
        constraint.oneway = true;
      }

      constraints.slider.push(constraint);
    }
  }

  // Generate random pin constraints (particles fixed in place)
  for (let i = 0; i < numParticles; i++) {
    if (rng() < pinProbability) {
      // Pin the mainaxle more often
      if (i === mainaxle || rng() < 0.15) {
        constraints.pin.push({ p: i, count: 2 });
      }
    }
  }

  // Optionally add rope constraints (more complex)
  if (allowRope && rng() < 0.2) {
    const p1 = Math.floor(rng() * numParticles);
    let p3 = Math.floor(rng() * numParticles);
    while (p3 === p1) {
      p3 = Math.floor(rng() * numParticles);
    }

    // Random number of pulleys (1-3)
    const numPulleys = 1 + Math.floor(rng() * 3);
    const pulleys = [];
    for (let i = 0; i < numPulleys; i++) {
      let pulleyIdx = Math.floor(rng() * numParticles);
      const wrapping = rng() < 0.5 ? "cw" : "ccw";
      pulleys.push({ idx: pulleyIdx, wrapping });
    }

    constraints.rope.push({ p1, pulleys, p3 });
  }

  return {
    projectile,
    mainaxle,
    armtip,
    axleheight: 8,
    timestep: 0.3,
    duration: 35,
    particles,
    constraints,
    topology: "arbitrary", // Mark as arbitrary topology
  };
}

/**
 * Generate multiple arbitrary trebuchets
 * @param {number} count - Number to generate
 * @param {number} baseSeed - Base seed
 * @param {Object} options - Generation options
 * @returns {Array} Array of trebuchet configurations
 */
export function generateArbitraryTrebuchets(count, baseSeed = 54321, options = {}) {
  const trebuchets = [];
  for (let i = 0; i < count; i++) {
    trebuchets.push({
      id: `Arbitrary-${i + 1}`,
      config: generateArbitraryTrebuchet(baseSeed + i / 1000, options),
    });
  }
  return trebuchets;
}

/**
 * Generate a semi-structured topology
 * Has some basic structure (main arm, counterweight) but random details
 * Intermediate between known-good and completely arbitrary
 * @param {number} seed - Random seed
 * @returns {Object} Trebuchet configuration
 */
export function generateSemiStructuredTrebuchet(seed = Math.random()) {
  let randomSeed = seed * 10000;
  function rng() {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  }

  const baseX = 536;
  const baseY = 472.7;

  // Random topology parameters
  const numArmSegments = 1 + Math.floor(rng() * 3); // 1-3 arm segments
  const hasHingedWeight = rng() < 0.5;
  const numExtraParticles = Math.floor(rng() * 3); // 0-2 extra particles

  const particles = [
    { x: baseX, y: baseY, mass: 1 }, // 0: Axle
  ];

  // Build arm segments
  let currentX = baseX;
  let currentY = baseY;
  let currentAngle = -0.3 - rng() * 0.3;

  const constraints = {
    rod: [],
    slider: [],
    pin: [],
  };

  for (let seg = 0; seg < numArmSegments; seg++) {
    const segLength = 50 + rng() * 100;
    currentX += Math.cos(currentAngle) * segLength;
    currentY += Math.sin(currentAngle) * segLength;

    particles.push({
      x: currentX,
      y: currentY,
      mass: 2 + rng() * 8,
    });

    // Connect to previous particle
    const prevIdx = particles.length - 2;
    const currIdx = particles.length - 1;
    constraints.rod.push({ p1: prevIdx, p2: currIdx });

    // Random angle change for next segment
    currentAngle += (rng() - 0.5) * 0.4;
  }

  const armtip = particles.length - 1;

  // Add counterweight side
  const counterAngle = currentAngle + Math.PI - rng() * 0.3;
  const counterLength = 40 + rng() * 80;
  const counterConnectX = baseX + Math.cos(counterAngle) * counterLength;
  const counterConnectY = baseY + Math.sin(counterAngle) * counterLength;

  particles.push({
    x: counterConnectX,
    y: counterConnectY,
    mass: 8 + rng() * 12,
  });

  const counterConnect = particles.length - 1;
  constraints.rod.push({ p1: 0, p2: counterConnect });

  // Add counterweight
  if (hasHingedWeight) {
    // Hinged counterweight
    const hingeLength = 30 + rng() * 50;
    particles.push({
      x: counterConnectX,
      y: counterConnectY + hingeLength,
      mass: 50 + rng() * 150,
    });
    constraints.rod.push({ p1: counterConnect, p2: particles.length - 1 });
  } else {
    // Fixed counterweight
    particles[counterConnect].mass = 50 + rng() * 150;
  }

  // Add projectile
  const slingLength = 80 + rng() * 120;
  particles.push({
    x: currentX + slingLength,
    y: currentY + slingLength * 0.5,
    mass: 0.5 + rng() * 2,
  });

  const projectile = particles.length - 1;
  constraints.rod.push({ p1: armtip, p2: projectile });

  // Add random extra particles and constraints
  for (let i = 0; i < numExtraParticles; i++) {
    particles.push({
      x: baseX + (rng() - 0.5) * 300,
      y: baseY + (rng() - 0.5) * 300,
      mass: 1 + rng() * 50,
    });

    // Randomly connect to existing particles
    const connectTo = Math.floor(rng() * (particles.length - 1));
    constraints.rod.push({ p1: connectTo, p2: particles.length - 1 });
  }

  // Add sliders
  constraints.slider.push({ p: 0, normal: { x: 0, y: 1 } });
  if (rng() < 0.5) {
    constraints.slider.push({ p: 0, normal: { x: 0.6, y: 1 } });
  }
  constraints.slider.push({ p: projectile, normal: { x: 0, y: 1 }, oneway: true });

  // Random additional sliders
  if (rng() < 0.3) {
    const randomParticle = 1 + Math.floor(rng() * (particles.length - 2));
    const angle = rng() * 2 * Math.PI;
    constraints.slider.push({
      p: randomParticle,
      normal: { x: Math.cos(angle), y: Math.sin(angle) },
    });
  }

  return {
    projectile,
    mainaxle: 0,
    armtip,
    axleheight: 8,
    timestep: 0.3,
    duration: 35,
    particles,
    constraints,
    topology: "semi-structured",
  };
}

/**
 * Generate multiple semi-structured trebuchets
 */
export function generateSemiStructuredTrebuchets(count, baseSeed = 99999) {
  const trebuchets = [];
  for (let i = 0; i < count; i++) {
    trebuchets.push({
      id: `SemiStructured-${i + 1}`,
      config: generateSemiStructuredTrebuchet(baseSeed + i / 1000),
    });
  }
  return trebuchets;
}
