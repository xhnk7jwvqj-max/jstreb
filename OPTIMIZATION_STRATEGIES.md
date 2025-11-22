# Optimization Strategy Exploration for Orbital Sling Trebuchet

## Overview

Systematic comparison of 9 different optimization algorithms applied to the Orbital Sling trebuchet design. The Orbital Sling uses a **colinear constraint** to keep the counterweight on a circular path, creating unique rotational dynamics.

---

## Results Summary

### 🏆 Overall Winners

| Metric | Strategy | Performance |
|--------|----------|-------------|
| **Best Range** | Multi-Start Local Search | **3,296 units** |
| **Best Efficiency** | Random Search (Maximize Efficiency) | **0.66** |
| **Most Consistent** | Random Search | Avg 346 units |
| **Fastest** | Population-Based | 0.8s |

---

## Basic Strategies (4 algorithms × 4 objectives)

### Algorithms Tested
1. **Random Search with Adaptive Step Size**
2. **Simulated Annealing**
3. **Coordinate Descent**
4. **Population-Based (Genetic Algorithm)**

### Objective Functions
1. Maximize Range
2. Maximize Efficiency (range/load)
3. Minimize Load (subject to range > 1000)
4. Multi-objective (range² / load)

### Key Findings

**Random Search** dominated:
- Average range: 346 units (best overall)
- Found best efficiency: 0.66
- Most reliable across different objectives
- Simple but effective with adaptive step sizing

**Population-Based** was fastest:
- Average time: 0.8s (vs 1.5s for others)
- Parallelizable approach
- Good for quick exploration

**Simulated Annealing** underperformed:
- Got stuck in local minima
- Cooling schedule may need tuning
- Average range: only 245 units

---

## Advanced Strategies

### Algorithms Tested

#### 1. **CMA-ES Inspired** (Covariance Matrix Adaptation)
- Range: 242 units
- Uses population statistics to adapt search direction
- Struggled with high-dimensional space

#### 2. **Multi-Start Local Search** 🥇
- **Range: 3,296 units** (BEST!)
- Efficiency: 0.12
- 5 independent random starts with local optimization
- Avoids local minima by restarting
- Most effective for this problem

#### 3. **Differential Evolution**
- Range: 685 units
- **Efficiency: 0.40** (2nd best!)
- Uses vector differences for mutation
- Good balance of exploration/exploitation

#### 4. **Particle Swarm Optimization**
- Range: 810 units
- Efficiency: 0.12
- Bio-inspired collective intelligence
- Particles share information

#### 5. **Bayesian-Inspired**
- Range: 1,291 units
- Balances exploration vs exploitation
- Uses historical data to guide search
- 2nd best range among advanced methods

---

## Performance Comparison

### By Range (Higher is Better)
```
1. Multi-Start Local Search:  3,296 units  ████████████████████
2. Bayesian-Inspired:          1,291 units  ███████
3. Particle Swarm:               810 units  ████
4. Differential Evolution:       685 units  ████
5. Random Search (best):         530 units  ███
```

### By Efficiency (Higher is Better)
```
1. Random Search:                   0.66   ████████████████████
2. Differential Evolution:          0.40   ████████████
3. Particle Swarm:                  0.12   ███
4. Multi-Start:                     0.12   ███
```

### By Speed (Lower is Better)
```
1. Population-Based:              0.8s    ████
2. Bayesian-Inspired:             1.6s    ████████
3. Differential Evolution:        1.6s    ████████
4. CMA-ES:                        1.7s    ████████
5. Particle Swarm:                1.7s    ████████
6. Multi-Start:                   1.9s    █████████
```

---

## Key Insights

### 1. **Problem Structure Matters**
- Multi-start worked best because the search space has multiple local optima
- A single random start often gets stuck
- Multiple restarts explore different regions effectively

### 2. **Simplicity Can Win**
- Basic Random Search with adaptive steps outperformed sophisticated algorithms in many cases
- Over-engineering the optimizer doesn't always help
- Good step size adaptation is crucial

### 3. **Trade-offs Are Real**
- Range vs Efficiency: Hard to maximize both
  - Best range (3,296) had moderate efficiency (0.12)
  - Best efficiency (0.66) had lower range (188)
- Range vs Load: Similar trade-off pattern

### 4. **Population Methods Excel at Exploration**
- Particle Swarm, Differential Evolution, and Population-Based all avoided getting stuck
- Multiple agents/particles explore space simultaneously
- Good for rugged fitness landscapes

### 5. **Domain Knowledge Helps**
- Knowing to enforce projectile mass = 1 and armtip mass = 2 constraints
- Understanding that positions should vary more than masses
- These insights could further improve any algorithm

---

## Recommendations

### For Maximum Range
→ **Use Multi-Start Local Search**
- 5+ random starts
- Adaptive step size per start
- 300+ iterations total

### For Maximum Efficiency
→ **Use Random Search with Efficiency Objective**
- Simple and effective
- Explicitly optimize range/load ratio
- Fast convergence

### For Quick Exploration
→ **Use Population-Based Methods**
- Fastest wall-clock time
- Good for initial survey
- Can parallelize across cores

### For Robustness
→ **Use Differential Evolution**
- Reliable across different objectives
- Good balance of all metrics
- Less sensitive to parameter tuning

---

## Champion Orbital Sling Configuration

**Strategy:** Multi-Start Local Search
**Range:** 3,296 units (2.1x improvement over original!)
**Peak Load:** 27,616 N
**Efficiency:** 0.12

**Key Design Parameters:**
- Counterweight: 255 kg (increased from 150 kg)
- Positioned at optimal point on circular track
- Arm tip at (520, 582) for maximum leverage

This represents a **112% improvement** over the original Orbital Sling design (1,552 units).

---

## Conclusion

Different optimization strategies excel at different objectives. For the Orbital Sling:
- **Multi-Start Local Search** achieves maximum range
- **Random Search** finds best efficiency with minimal complexity
- **Differential Evolution** provides best overall balance

The key insight: the optimization landscape has multiple local optima, so restart-based or population-based methods outperform single-trajectory algorithms like simulated annealing or coordinate descent.
