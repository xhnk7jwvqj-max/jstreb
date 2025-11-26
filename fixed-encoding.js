/**
 * Fixed-size vector encoding for trebuchet topologies
 * Compatible with CMA-ES, PSO, and other gradient-based optimizers
 */

/**
 * Encoding for n particles:
 * - Binary: n² rod bits + n pin bits + n slider bits
 * - Continuous: 2n positions (x,y) + n masses + 2n slider normals (x,y)
 *
 * For n=8:
 * - 64 rod bits + 8 pin bits + 8 slider bits = 80 binary
 * - 16 positions + 8 masses + 16 slider normals = 40 continuous
 * - Total: 120 dimensional vector
 */

export class FixedEncoding {
  constructor(numParticles = 8, bounds = {
    posX: [350, 650],
    posY: [350, 650],
    mass: [1, 100],
  }) {
    this.n = numParticles;
    this.bounds = bounds;

    // Dimension calculations
    this.numRodBits = numParticles * numParticles;
    this.numPinBits = numParticles;
    this.numSliderBits = numParticles;
    this.numBinary = this.numRodBits + this.numPinBits + this.numSliderBits;

    this.numPositions = 2 * numParticles; // x, y pairs
    this.numMasses = numParticles;
    this.numSliderNormals = 2 * numParticles; // x, y for each slider
    this.numContinuous = this.numPositions + this.numMasses + this.numSliderNormals;

    this.totalDim = this.numBinary + this.numContinuous;

    // Index offsets for continuous section
    this.posOffset = 0;
    this.massOffset = this.numPositions;
    this.sliderNormalOffset = this.numPositions + this.numMasses;
  }

  /**
   * Decode vector to trebuchet config
   */
  decode(vector) {
    const n = this.n;

    // Split binary and continuous
    const binary = vector.slice(0, this.numBinary);
    const continuous = vector.slice(this.numBinary);

    // Decode continuous values with clipping
    const positions = [];
    for (let i = 0; i < n; i++) {
      // Clip to [0, 1] before denormalization
      const xNorm = Math.max(0, Math.min(1, continuous[this.posOffset + 2*i]));
      const yNorm = Math.max(0, Math.min(1, continuous[this.posOffset + 2*i + 1]));
      const x = this._denormalize(xNorm, this.bounds.posX);
      const y = this._denormalize(yNorm, this.bounds.posY);
      positions.push({ x, y });
    }

    const masses = [];
    for (let i = 0; i < n; i++) {
      // Clip to [0, 1] before denormalization
      const massNorm = Math.max(0, Math.min(1, continuous[this.massOffset + i]));
      const mass = this._denormalize(massNorm, this.bounds.mass);
      masses.push(mass);
    }

    const sliderNormals = [];
    for (let i = 0; i < n; i++) {
      const nx = continuous[this.sliderNormalOffset + 2*i];
      const ny = continuous[this.sliderNormalOffset + 2*i + 1];
      // Normalize to unit vector
      const len = Math.sqrt(nx*nx + ny*ny) || 1;
      sliderNormals.push({ x: nx/len, y: ny/len });
    }

    // Decode binary constraints (clip to [0,1] first)
    const rods = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const idx = i * n + j;
        const value = Math.max(0, Math.min(1, binary[idx]));
        if (value > 0.5) { // threshold for binary
          rods.push({ p1: i, p2: j });
        }
      }
    }

    const pins = [];
    for (let i = 0; i < n; i++) {
      const idx = this.numRodBits + i;
      const value = Math.max(0, Math.min(1, binary[idx]));
      if (value > 0.5) {
        pins.push({ p: i });
      }
    }

    const sliders = [];
    for (let i = 0; i < n; i++) {
      const idx = this.numRodBits + this.numPinBits + i;
      const value = Math.max(0, Math.min(1, binary[idx]));
      if (value > 0.5) {
        sliders.push({
          p: i,
          normal: sliderNormals[i],
        });
      }
    }

    // Build particles array
    const particles = [];
    for (let i = 0; i < n; i++) {
      particles.push({
        x: positions[i].x,
        y: positions[i].y,
        mass: masses[i],
      });
    }

    // Fixed roles
    const projectile = 3; // Fixed index
    const armtip = 1;     // Fixed index

    // Build config
    const config = {
      projectile,
      mainaxle: 0, // Will be updated by updateMainaxleToHighest
      armtip,
      axleheight: 8,
      timestep: 0.3,
      duration: 35,
      particles,
      constraints: {
        rod: rods,
        slider: sliders,
        pin: pins,
        colinear: [],
        f2k: [],
        rope: [],
      },
    };

    // Update mainaxle to highest particle with pin/slider
    this._updateMainaxleToHighest(config);

    return config;
  }

  /**
   * Encode trebuchet config to vector
   */
  encode(config) {
    const n = this.n;
    const vector = new Array(this.totalDim).fill(0);

    // Encode binary constraints
    for (const rod of (config.constraints.rod || [])) {
      const i = Math.min(rod.p1, rod.p2);
      const j = Math.max(rod.p1, rod.p2);
      if (i < n && j < n) {
        const idx = i * n + j;
        vector[idx] = 1;
      }
    }

    for (const pin of (config.constraints.pin || [])) {
      if (pin.p < n) {
        const idx = this.numRodBits + pin.p;
        vector[idx] = 1;
      }
    }

    const sliderNormalMap = new Map();
    for (const slider of (config.constraints.slider || [])) {
      if (slider.p < n) {
        const idx = this.numRodBits + this.numPinBits + slider.p;
        vector[idx] = 1;
        sliderNormalMap.set(slider.p, slider.normal);
      }
    }

    // Encode continuous values
    const continuous = [];

    // Positions
    for (let i = 0; i < n; i++) {
      if (i < config.particles.length) {
        continuous.push(this._normalize(config.particles[i].x, this.bounds.posX));
        continuous.push(this._normalize(config.particles[i].y, this.bounds.posY));
      } else {
        continuous.push(0.5); // default center
        continuous.push(0.5);
      }
    }

    // Masses
    for (let i = 0; i < n; i++) {
      if (i < config.particles.length) {
        continuous.push(this._normalize(config.particles[i].mass, this.bounds.mass));
      } else {
        continuous.push(0.5); // default mid-range
      }
    }

    // Slider normals
    for (let i = 0; i < n; i++) {
      const normal = sliderNormalMap.get(i) || { x: 0, y: 1 };
      continuous.push(normal.x);
      continuous.push(normal.y);
    }

    // Combine binary and continuous
    return [...vector.slice(0, this.numBinary), ...continuous];
  }

  /**
   * Create random vector
   */
  randomVector(rng = Math.random) {
    const vector = [];

    // Binary section: random 0 or 1 with some sparsity
    for (let i = 0; i < this.numBinary; i++) {
      vector.push(rng() < 0.3 ? 1 : 0); // 30% density
    }

    // Continuous section: random in [0, 1] for normalized values
    for (let i = 0; i < this.numContinuous; i++) {
      vector.push(rng());
    }

    return vector;
  }

  /**
   * Get bounds for continuous variables (for CMA-ES)
   */
  getContinuousBounds() {
    const lower = [];
    const upper = [];

    // All normalized continuous variables are in [0, 1]
    // But slider normals can be negative
    for (let i = 0; i < this.numPositions + this.numMasses; i++) {
      lower.push(0);
      upper.push(1);
    }

    // Slider normals can be in [-1, 1]
    for (let i = 0; i < this.numSliderNormals; i++) {
      lower.push(-1);
      upper.push(1);
    }

    return { lower, upper };
  }

  // Helper methods
  _normalize(value, [min, max]) {
    return (value - min) / (max - min);
  }

  _denormalize(normalized, [min, max]) {
    return min + normalized * (max - min);
  }

  _updateMainaxleToHighest(config) {
    const particlesWithConstraints = new Set();

    if (config.constraints.pin) {
      for (const pin of config.constraints.pin) {
        particlesWithConstraints.add(pin.p);
      }
    }

    if (config.constraints.slider) {
      for (const slider of config.constraints.slider) {
        particlesWithConstraints.add(slider.p);
      }
    }

    if (particlesWithConstraints.size === 0) {
      config.mainaxle = 0;
      return;
    }

    let highestParticle = -1;
    let highestY = -Infinity;

    for (const particleIdx of particlesWithConstraints) {
      if (particleIdx < config.particles.length) {
        const y = config.particles[particleIdx].y;
        if (y > highestY) {
          highestY = y;
          highestParticle = particleIdx;
        }
      }
    }

    if (highestParticle !== -1) {
      config.mainaxle = highestParticle;
    }
  }
}
