/**
 * Random Trebuchet Topology Generator
 * Generates random but valid trebuchet configurations for testing
 */

/**
 * Generate a random simple trebuchet configuration
 * @param {number} seed - Random seed for reproducibility
 * @returns {Object} Trebuchet configuration
 */
export function generateRandomTrebuchet(seed = Math.random()) {
  // Simple seeded random number generator
  let randomSeed = seed * 10000;
  function seededRandom() {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  }

  // Decide on trebuchet type
  const trebuchetType = seededRandom();

  if (trebuchetType < 0.33) {
    // Generate a hinged counterweight design
    return generateHingedCounterweight(seededRandom);
  } else if (trebuchetType < 0.66) {
    // Generate a floating arm design
    return generateFloatingArm(seededRandom);
  } else {
    // Generate a whipper design
    return generateWhipper(seededRandom);
  }
}

function generateHingedCounterweight(rng) {
  const baseX = 536;
  const baseY = 472.7;

  // Randomize key parameters
  const armLength = 150 + rng() * 100; // 150-250
  const throwingArmRatio = 0.4 + rng() * 0.3; // 0.4-0.7
  const counterweightMass = 50 + rng() * 150; // 50-200
  const projectileMass = 0.5 + rng() * 2; // 0.5-2.5
  const armMass = 2 + rng() * 6; // 2-8
  const hingeArmLength = 30 + rng() * 50; // 30-80

  const throwingArmLength = armLength * throwingArmRatio;
  const counterArmLength = armLength * (1 - throwingArmRatio);

  const angle = -0.4 + rng() * 0.3; // Initial angle variation

  const particles = [
    { x: baseX, y: baseY, mass: 1 }, // 0: Main axle
    {
      x: baseX - Math.cos(angle) * throwingArmLength,
      y: baseY + Math.sin(angle) * throwingArmLength,
      mass: armMass
    }, // 1: Arm tip
    {
      x: baseX + Math.cos(angle) * counterArmLength,
      y: baseY - Math.sin(angle) * counterArmLength,
      mass: 10
    }, // 2: Counter weight connection
    {
      x: baseX - Math.cos(angle) * throwingArmLength + 100,
      y: baseY + Math.sin(angle) * throwingArmLength + 200,
      mass: projectileMass
    }, // 3: Projectile
    {
      x: baseX + Math.cos(angle) * counterArmLength,
      y: baseY - Math.sin(angle) * counterArmLength + hingeArmLength,
      mass: counterweightMass
    }, // 4: Counter weight
  ];

  const constraints = {
    rod: [
      { p1: 0, p2: 1 }, // Main arm
      { p1: 0, p2: 2 }, // Counter arm
      { p1: 1, p2: 3 }, // Sling
      { p1: 2, p2: 4 }, // Hinge to weight
      { p1: 1, p2: 2 }, // Structural brace
    ],
    slider: [
      { p: 0, normal: { x: 0, y: 1 } }, // Axle vertical
      { p: 0, normal: { x: 0.6, y: 1 } }, // Axle angled
      { p: 3, normal: { x: 0, y: 1 }, oneway: true }, // Projectile release
    ],
  };

  return {
    projectile: 3,
    mainaxle: 0,
    armtip: 1,
    axleheight: 8,
    timestep: 0.3,
    duration: 35,
    particles,
    constraints,
  };
}

function generateFloatingArm(rng) {
  const baseX = 487.0;
  const baseY = 517.0;

  const armLength = 150 + rng() * 100;
  const throwingArmRatio = 0.4 + rng() * 0.3;
  const counterweightMass = 50 + rng() * 150;
  const projectileMass = 0.5 + rng() * 2;
  const armMass = 2 + rng() * 6;

  const throwingArmLength = armLength * throwingArmRatio;
  const counterArmLength = armLength * (1 - throwingArmRatio);

  const angle = -0.3 + rng() * 0.2;
  const sliderAngle = -0.5 + rng() * 0.3; // Randomize slider direction

  const particles = [
    { x: baseX, y: baseY, mass: 1 }, // 0: Floating axle
    {
      x: baseX - Math.cos(angle) * throwingArmLength,
      y: baseY + Math.sin(angle) * throwingArmLength,
      mass: armMass
    }, // 1: Arm tip
    {
      x: baseX + Math.cos(angle) * counterArmLength,
      y: baseY - Math.sin(angle) * counterArmLength,
      mass: counterweightMass
    }, // 2: Counter weight
    {
      x: baseX - Math.cos(angle) * throwingArmLength + 50,
      y: baseY + Math.sin(angle) * throwingArmLength + 150,
      mass: projectileMass
    }, // 3: Projectile
  ];

  const constraints = {
    rod: [
      { p1: 0, p2: 1 },
      { p1: 0, p2: 2 },
      { p1: 1, p2: 3 },
      { p1: 1, p2: 2 },
    ],
    slider: [
      { p: 0, normal: { x: 0, y: 1 } }, // Axle vertical slide
      { p: 2, normal: { x: sliderAngle, y: 0 } }, // Counter weight slide
      { p: 3, normal: { x: 0, y: 1 }, oneway: true }, // Projectile release
    ],
  };

  return {
    projectile: 3,
    mainaxle: 0,
    armtip: 1,
    axleheight: 8,
    timestep: 0.3,
    duration: 35,
    particles,
    constraints,
  };
}

function generateWhipper(rng) {
  const baseX = 536;
  const baseY = 472.7;

  const mainArmLength = 150 + rng() * 80;
  const secondArmLength = 50 + rng() * 70;
  const throwingArmRatio = 0.35 + rng() * 0.25;
  const counterweightMass = 100 + rng() * 200;
  const projectileMass = 0.5 + rng() * 2;
  const armMass = 2 + rng() * 6;
  const secondArmMass = 5 + rng() * 15;

  const throwingArmLength = mainArmLength * throwingArmRatio;
  const counterArmLength = mainArmLength * (1 - throwingArmRatio);

  const angle = -0.3 + rng() * 0.2;
  const secondAngle = angle - 0.3 - rng() * 0.2;

  const particles = [
    { x: baseX, y: baseY, mass: 1 }, // 0: Main axle
    {
      x: baseX - Math.cos(angle) * throwingArmLength,
      y: baseY + Math.sin(angle) * throwingArmLength,
      mass: armMass
    }, // 1: Primary arm tip
    {
      x: baseX + Math.cos(angle) * counterArmLength,
      y: baseY - Math.sin(angle) * counterArmLength,
      mass: secondArmMass
    }, // 2: Counter arm connection
    {
      x: baseX - Math.cos(angle) * throwingArmLength - Math.cos(secondAngle) * secondArmLength,
      y: baseY + Math.sin(angle) * throwingArmLength + Math.sin(secondAngle) * secondArmLength,
      mass: projectileMass
    }, // 3: Projectile
    {
      x: baseX + Math.cos(angle) * counterArmLength,
      y: baseY - Math.sin(angle) * counterArmLength + 50,
      mass: counterweightMass
    }, // 4: Counter weight
  ];

  const constraints = {
    rod: [
      { p1: 0, p2: 1 }, // Main throwing arm
      { p1: 0, p2: 2 }, // Counter arm
      { p1: 1, p2: 3 }, // Second throwing arm
      { p1: 2, p2: 4 }, // Weight connection
      { p1: 1, p2: 2 }, // Structural connection
      { p1: 0, p2: 3, oneway: true }, // One-way constraint for whip effect
      { p1: 0, p2: 4, oneway: true }, // One-way constraint
    ],
    slider: [
      { p: 0, normal: { x: 0, y: 1 } }, // Axle vertical
      { p: 0, normal: { x: 0.6, y: 1 } }, // Axle angled
    ],
  };

  return {
    projectile: 3,
    mainaxle: 0,
    armtip: 1,
    axleheight: 8,
    timestep: 0.3,
    duration: 60,
    particles,
    constraints,
  };
}

/**
 * Generate multiple random trebuchets
 * @param {number} count - Number of trebuchets to generate
 * @param {number} baseSeed - Base seed for reproducibility
 * @returns {Array} Array of trebuchet configurations
 */
export function generateRandomTrebuchets(count, baseSeed = 12345) {
  const trebuchets = [];
  for (let i = 0; i < count; i++) {
    trebuchets.push({
      id: `Random-${i + 1}`,
      config: generateRandomTrebuchet(baseSeed + i / 1000),
    });
  }
  return trebuchets;
}
