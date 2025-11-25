# Topology Search Experiment Report

## Executive Summary

**Question**: Can we discover high-performing trebuchet topologies through algorithmic search, without using knowledge of known-good designs?

**Approach**: Genetic algorithm with topology-level mutation operators over 40 generations with population of 40.

**Result**: **Modest success** - Evolution worked (554% improvement) but discovered topology significantly underperforms human-designed topologies.

**Key Finding**: Topology search is vastly harder than parameter optimization. Human domain knowledge provides orders-of-magnitude advantage over blind search.

## Motivation

Previous experiments showed that:
1. Parameter optimization works well within good topologies
2. Arbitrary random topologies are non-functional
3. Topology choice is fundamental to performance

This raises the question: **Can we algorithmically discover good topologies?**

This is the holy grail of mechanical design - automated invention of novel mechanisms without human insight.

## Methodology

### Search Algorithm: Genetic Algorithm

#### 1. Representation
Each individual is a complete trebuchet topology:
- Variable number of particles (positions + masses)
- Variable constraint graph (rods, sliders, pins)
- Special particle designations (axle, projectile, arm tip)

#### 2. Initial Population (n=40)
Random topologies with basic structure:
- 4-8 particles
- Random positions around basepoint
- Random masses (1-200)
- ~80% particles per rod connections
- Some random sliders
- Designated special particles

#### 3. Fitness Function
**Primary metric**: Projectile range
- Evaluated via full physics simulation
- Invalid topologies get fitness = 0
- No bonus for simplicity or other factors

#### 4. Selection
- Elite selection: Keep top 5 performers
- Parent selection: Choose from top 50% by fitness
- Tournament-style with stochastic elements

#### 5. Mutation Operators

Eight mutation types applied with 30% probability:

**Structural mutations** (change topology):
- **Add particle**: New random position and mass
- **Remove particle**: Delete particle and its constraints
- **Add rod**: Random new rod constraint between two particles
- **Remove rod**: Delete random existing rod
- **Add slider**: Random slider constraint with random normal direction
- **Remove slider**: Delete random existing slider

**Parameter mutations** (tune existing topology):
- **Modify position**: Small position perturbation (±20 units)
- **Modify mass**: Multiply by random factor (0.7-1.3x)

Each individual receives 1-3 random mutations per generation.

#### 6. Evolution Process
- Evaluate fitness of all 40 individuals
- Sort by fitness
- Keep top 5 elite unchanged
- Generate 35 offspring by mutating top performers
- Repeat for 40 generations

### Computational Cost
- **Configurations evaluated**: 40 × 40 = 1,600
- **Simulations per evaluation**: ~1-3 (with perturbations)
- **Total simulations**: ~2,000-4,000
- **Runtime**: ~8 seconds

## Results

### Evolution Trajectory

| Generation | Best Fitness | Avg Fitness | Valid Count |
|------------|--------------|-------------|-------------|
| 0 | 10.21 | 0.89 | 40/40 |
| 5 | 13.06 | 10.27 | 40/40 |
| 10 | 27.94 | 12.28 | 39/40 |
| 15 | 39.01 | 28.47 | 40/40 |
| 20 | 43.70 | 36.20 | 40/40 |
| 25 | 45.54 | 37.65 | 40/40 |
| 30 | 54.12 | 36.77 | 39/40 |
| 35 | 66.82 | 38.59 | 40/40 |
| **39** | **66.82** | **53.03** | **39/40** |

**Improvement**: 10.21 → 66.82 (**+554%** over initial best)

### Best Discovered Topology

**Performance**: Range = 66.82

**Configuration**:
- **Particles**: 6
- **Rods**: 5
- **Sliders**: 3 (2 one-way, 1 bidirectional)
- **Pins**: 1 (fixing the axle)
- **Total mass**: 611.0
- **Projectile mass**: 87.4

**Structure**:
```
Particle 5 (mass 279.1) is the hub:
  └─ Connected to: 0 (axle, mass 20.3)
  └─ Connected to: 1 (armtip, mass 167.1)
  └─ Connected to: 3 (projectile, mass 87.4)

Particle 3 (projectile):
  └─ Connected to: 4 (mass 9.7)

Particle 2 (mass 47.4):
  └─ Connected to: 4

Axle (0) is pinned in place
Projectile (3) has one-way slider (release mechanism)
Particle 2 has one-way slider
Particle 4 has bidirectional slider
```

**Mechanical interpretation**:
- Particle 5 acts as a counterweight (heaviest at 279.1)
- Connected to lighter axle particle
- Arm connects counterweight hub to projectile
- Some slider constraints provide additional degrees of freedom
- Structure is simpler than known designs

### Comparison with Known Designs

| Rank | Design | Range | Type |
|------|--------|-------|------|
| 1 | Pulley Sling | 6,298.28 | Human (known) |
| 2 | Fiffer | 4,226.11 | Human (known) |
| 3 | Floating Arm Whipper (NASAW) | 4,225.05 | Human (known) |
| 4 | F2k | 3,857.67 | Human (known) |
| 5 | Floating Arm King Arthur | 3,469.56 | Human (known) |
| 6 | MURLIN | 2,636.13 | Human (known) |
| 7 | Whipper | 1,851.60 | Human (known) |
| 8 | Floating Arm Trebuchet | 1,120.52 | Human (known) |
| 9 | Launch Ness Monster | 873.09 | Human (known) |
| 10 | Hinged Counterweight | 331.21 | Human (known) |
| 11 | Fixed Counterweight | 304.16 | Human (known) |
| **12** | **Discovered Topology** | **66.82** | **Algorithmic (GA)** |

**Performance gap**: 4.5x worse than worst human design, 94x worse than best human design.

## Analysis

### What Worked

#### 1. Evolution Clearly Functioned
- **554% improvement** from gen 0 to gen 39
- Steady upward trend in best fitness
- Average fitness also improved (0.89 → 53.03)
- Clear selection pressure and response

#### 2. High Validity Rate
- **99.5% valid topologies** on average
- Nearly all generated topologies can simulate
- Few catastrophic failures
- Mutation operators preserve basic validity

#### 3. Structural Simplicity
- Discovered topology uses only 6 particles
- Simpler than most human designs (which use 4-9 particles)
- Demonstrates parsimony in search

#### 4. Plausible Mechanical Structure
- Has counterweight (heavy particle 5)
- Has release mechanism (one-way slider on projectile)
- Has fixed axle (pinned particle 0)
- Basic physics principles present

### What Didn't Work

#### 1. Performance Gap is Enormous
- 94x worse than best human design
- 4.5x worse than simplest human design
- Ranked dead last among all tested topologies
- Not competitive despite 1,600 evaluations

#### 2. Limited Diversity Exploration
- Population may have converged prematurely
- Elite selection preserves similar topologies
- Mutation operators may be too local
- No mechanism for radical topology changes

#### 3. No Complex Mechanisms Discovered
- No rope/pulley systems (like Pulley Sling, MURLIN)
- No floating arms (like FAT, NASAW)
- No whipper action (like Whipper, Fiffer)
- No F2k-style mechanics
- Stuck in "simple lever" topology class

#### 4. Search Space is Vastly Undersampled
- Topology space is enormous (combinatorial)
- 1,600 evaluations is trivial compared to space size
- Would need millions or billions of evaluations
- Curse of dimensionality in action

## Why Is Topology Search So Hard?

### 1. Combinatorial Explosion
The number of possible topologies grows super-exponentially:
- n particles → O(n²) possible rods
- Each rod can be present/absent → 2^(n²) possible rod sets
- Plus sliders, pins, rope/pulleys...
- **Search space is unimaginably vast**

### 2. Sparse Reward Signal
- Most random topologies have zero or near-zero fitness
- Small random changes usually make things worse
- Hard to find "gradient" to follow uphill
- Local optima everywhere

### 3. Non-Decomposability
- Can't optimize parts independently
- Changing one constraint affects entire system dynamics
- Holistic evaluation required
- No modular fitness functions

### 4. Discrete Structure
- Topology is discrete (have rod or don't)
- No smooth gradient to follow
- Can't use gradient descent
- Limited to local search or random jumps

### 5. Functional Requirements
A good trebuchet needs:
- Energy storage (counterweight)
- Energy transfer (lever arm)
- Amplification (mechanical advantage)
- Release mechanism (projectile separation)
- Stability (doesn't collapse)

These aren't obvious from the representation. GA has to discover them blindly.

## Human vs. Algorithm: The Knowledge Gap

### Human Design Process
1. **Physics intuition**: Understand energy, momentum, leverage
2. **Mechanism knowledge**: Know about levers, pulleys, hinges
3. **Historical knowledge**: Study existing trebuchets
4. **Iterative refinement**: Build prototypes, test, modify
5. **Creative insight**: Invent novel combinations (F2k, MURLIN)

**Result**: Designs that embody centuries of accumulated knowledge

### Algorithmic Search (This Experiment)
1. **Random initialization**: No prior knowledge
2. **Local mutations**: Small random changes
3. **Fitness evaluation**: Just measure range
4. **Selection**: Keep what works better
5. **Iteration**: Repeat for 40 generations

**Result**: Found local optimum in "simple lever" region of space

### The Missing Ingredient: Inductive Bias

The GA has no **inductive bias** toward good mechanisms:
- Doesn't know levers are useful
- Doesn't know counterweights should be heavy
- Doesn't know pulleys can multiply force
- Doesn't know release timing matters

Human designers have all this knowledge built-in. The algorithm must discover it from scratch.

## Implications

### 1. For Automated Design
- **Topology search is orders of magnitude harder than parameter optimization**
- Simple GAs are insufficient for complex mechanical design
- Need more sophisticated approaches:
  - Graph grammars to generate valid mechanisms
  - Hierarchical search (components → systems)
  - Transfer learning from simple to complex
  - Human-in-the-loop guidance
  - Physics-informed priors

### 2. For Engineering Creativity
- **Human insight is irreplaceable (for now)**
- Centuries of engineering knowledge compressed into known topologies
- Algorithms can't easily replicate this knowledge
- Creative mechanism design requires understanding, not just optimization

### 3. For AI and Machine Learning
- **Representation matters profoundly**
- Raw constraint graphs are too low-level
- Need higher-level primitives (mechanical building blocks)
- Similar to neural architecture search challenges
- Success requires domain-appropriate representations

### 4. For Evolutionary Computation
- **Evolution can improve but struggles to invent**
- Good at hill-climbing, bad at exploring vast spaces
- Needs better exploration mechanisms
- Population diversity is crucial
- Computational budget matters enormously

## Comparison with Parameter Optimization

Recall from earlier experiments:
- **Parameter optimization** within good topology: -82% sensitivity reduction, massive range improvement
- **Topology search**: +554% improvement but still performs terribly

This demonstrates the hierarchical nature:
- **Level 1 (Topology)**: Choose mechanism type - **HARD** to search
- **Level 2 (Parameters)**: Tune positions/masses - **EASY** to optimize

Getting Level 1 right is critical. Level 2 optimization only works if Level 1 is good.

## What Would It Take to Succeed?

### Short-term improvements (might reach human parity):
1. **Larger population** (100-500 individuals)
2. **More generations** (100-500)
3. **Better mutation operators**:
   - Template-based mutations (insert known mechanism patterns)
   - Hierarchical mutations (add subgraph modules)
   - Adaptive mutation rates
4. **Multi-objective fitness**:
   - Range + efficiency + robustness
   - Penalize overly complex topologies
   - Reward mechanical principles
5. **Smarter initialization**:
   - Seed with partial mechanisms
   - Use mechanical primitives (lever, pulley, etc.)

### Long-term approaches (might exceed human designs):
1. **Hybrid human-AI design**:
   - Human specifies constraints/goals
   - AI explores within those constraints
   - Iterative collaboration
2. **Learned representations**:
   - Train ML model on successful mechanisms
   - Generate new topologies from learned distribution
   - Transfer learning across mechanism types
3. **Physics-informed search**:
   - Encode physical principles as constraints
   - Guide search toward feasible mechanisms
   - Use simulators in the loop
4. **Massive computational scale**:
   - Millions of evaluations
   - Distributed search
   - Neural architecture search-style approaches

## Conclusions

### Main Findings

1. **✓ Evolution works**: 554% improvement demonstrates GA can optimize
2. **✗ Not competitive**: 94x worse than best human design shows limits
3. **✓ Search is viable**: Found functional topology (not zero range)
4. **✗ Huge gap remains**: Human knowledge provides massive advantage

### Theoretical Insights

1. **Topology search >> Parameter optimization** in difficulty
2. **Domain knowledge** is incredibly valuable for design
3. **Search space structure** matters enormously
4. **Representation** determines what's discoverable

### Practical Guidance

**For automated design research**:
- Don't underestimate topology search difficulty
- Invest in representation engineering
- Consider hybrid human-AI approaches
- Use domain knowledge as inductive bias

**For engineering practice**:
- Algorithmic search complements but doesn't replace human creativity
- Use search for parameter tuning, not topology invention (yet)
- Human-designed topologies encode irreplaceable knowledge
- Automation works best with human-specified constraints

### The Big Picture

This experiment demonstrates why **mechanism invention is hard**.

Known trebuchet designs (FAT, Whipper, MURLIN, F2k, etc.) represent **accumulated human ingenuity over centuries**. They embody:
- Physical intuition
- Trial-and-error experience
- Creative insight
- Engineering craftsmanship

A simple genetic algorithm with 1,600 evaluations cannot replicate this knowledge base. The discovered topology works, but is primitive compared to human designs.

This doesn't mean topology search is impossible - it means **we need much more sophisticated approaches**. The same challenge exists in neural architecture search, molecular design, and any domain where structure matters fundamentally.

The path forward likely requires:
- Better representations (mechanical primitives, not raw graphs)
- More computational power (millions of evaluations)
- Smarter algorithms (physics-informed, hierarchical)
- Human collaboration (guided search, not blind exploration)

Topology optimization remains an open frontier in engineering AI.

---

*Experiment conducted: 2025-11-25*
*Algorithm: Genetic algorithm with topology mutations*
*Generations: 40*
*Population: 40*
*Evaluations: 1,600*
*Best discovered range: 66.82*
*Best human design: 6,298.28 (Pulley Sling)*
*Performance gap: 94x*
