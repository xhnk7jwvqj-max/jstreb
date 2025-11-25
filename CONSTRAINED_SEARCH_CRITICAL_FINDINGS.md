# Constrained Search: Critical Findings

## Executive Summary

The constrained topology search (with force ≤ 15,000 lbf and energy conservation requirements) **FAILED** to find a valid design. The reported "champion" with 562,366 ft range is a **simulation/calculation bug exploit**, not a real trebuchet.

---

## The Bug Exploit

### What the Genetic Algorithm Found

The GA discovered a topology that **exploits a critical bug** in the range calculation:

**The Exploit**:
1. Place all particles **below ground level** (Y < 0)
2. The projectile starts at Y = -558.63 m (558 meters BELOW ground)
3. Projectile never surfaces during simulation
4. The `calculateRange` function malfunctions when projectile starts below Y=0
5. Returns garbage value: 562,366 ft instead of actual ~1,760 ft

### Evidence

| Metric | Reported | Actual |
|--------|----------|--------|
| **Range** | **562,366 ft** | **~1,760 ft** |
| Projectile start Y | - | -558.63 m (below ground!) |
| Projectile end Y | - | -580.98 m (still below!) |
| Ground crossing | - | At t=0 (immediate) |
| Avg horizontal velocity | - | 0.14 m/s (barely moving) |
| Launch speed | - | 80.17 m/s (reasonable) |
| **Discrepancy** | - | **320x overestimate!** |

---

## How This Happened

### 1. No Ground-Level Constraint

The genetic algorithm had **no constraint requiring particles to start above ground**. It could freely place particles at any Y coordinate, including deep underground.

### 2. Range Calculation Assumes Above-Ground Start

The `calculateRange` function likely:
```javascript
// Pseudocode of likely logic
function calculateRange(trajectories, config) {
  // Find when projectile crosses Y = 0 (ground level)
  for (trajectory of trajectories) {
    if (projectileY < 0) {
      return projectileX; // Return X position at crossing
    }
  }
  // ... fallback logic
}
```

**Problem**: If projectile *starts* below Y=0, the first timestep immediately triggers the condition, causing garbage output.

### 3. Evolution Optimized the Bug

1. Random mutation placed particles below ground
2. Bug caused inflated range value
3. Fitness function rewarded inflated value
4. Evolution doubled down on the exploit
5. Result: Design with particles 558m underground claiming 106-mile range

---

## The Real Performance

### Actual Metrics

When we trace the projectile trajectory:

- **Actual final position**: 536.41 m = **1,760 ft**
- **Launch velocity**: 80.17 m/s (reasonable for trebuchet)
- **Peak force**: 14,940 lbf (within limit)
- **Energy conserved**: Yes

**True range: ~1,760 ft** - respectable but not record-breaking

### Comparison

| Design | Range (ft) | Status |
|--------|-----------|--------|
| **Constrained "Champion"** | **1,760** (actual) | Bug exploit |
| Pulley Sling | 6,298 | Valid |
| Fiffer | 4,226 | Valid |
| F2k | 3,858 | Valid |

**The constrained champion ranks LAST** among valid designs when measured correctly!

---

## Why Constraints Failed

The search had three constraints:
1. ✓ Peak force ≤ 15,000 lbf
2. ✓ Energy conservation (5% tolerance)
3. ✗ **Missing: Particles must start above ground**

Without constraint #3, the GA exploited the gap.

---

## Root Cause Analysis

### The Coordinate System Issue

Looking at the code:
- Simulation uses Y-axis with **Y increasing upward** (standard physics)
- But nothing enforces Y ≥ 0 for initial positions
- Particles can be placed at Y = -500, -600, -700 (deep underground)

### The Range Calculation Bug

The `calculateRange` function in trebuchetsimulation.js likely has logic like:

```javascript
// Find when projectile hits ground (Y = 0)
for (let i = 0; i < trajectories.length; i++) {
  const y = -trajectories[i][2 * config.projectile + 1];
  if (y < 0) {  // Projectile below ground
    return trajectories[i][2 * config.projectile] * 3.28084; // Return X in feet
  }
}
```

**Problem**: If trajectory[0] already has Y < 0, this returns immediately with whatever X value exists, which may be manipulated by the GA.

Or worse, if the check is `y <= 0`, it triggers on the very first frame, and depending on how X is calculated, could use a wrong formula or reference.

---

## Evolution of the Exploit

Tracking the search history shows the exploit developed over generations:

### Early Generations (0-500)

- Gen 0: Best = 28.87 ft (reasonable)
- Gen 100: Best = 211.69 ft (improving normally)
- Gen 500: Best = 743.21 ft (still plausible)

**Status**: Normal evolution within physics

### Middle Generations (500-800)

- Gen 600: Best = 1,540.50 ft (good)
- Gen 750: Best = 9,891.18 ft (suspicious)
- Gen 800: Best = 11,039.82 ft (definitely exploiting)

**Status**: Bug exploit discovered around gen 600-700

### Late Generations (800-1000)

- Gen 805: Best = 18,727.60 ft
- Gen 815: Best = **112,745.28 ft** (massive jump!)
- Gen 830: Best = **275,758.93 ft**
- Gen 997: Best = **562,366.46 ft** (final)

**Status**: Full exploitation mode

### The Pattern

1. **Gen 0-600**: Normal evolution, ranges 0-2,000 ft
2. **Gen 600-750**: Exploit discovered, ranges 2,000-10,000 ft
3. **Gen 750-815**: Exploit refined, ranges 10,000-100,000 ft
4. **Gen 815-1000**: Extreme exploitation, ranges 100,000-562,000 ft

**The GA learned to exploit the bug incrementally over 400 generations.**

---

## Physical Impossibility

Even if we ignore the bug, the design is physically implausible:

### Initial Configuration

- Particles start 501-763 m **below ground**
- In reality: Impossible (requires underground construction)
- In simulation: No problem! (no ground collision detection)

### Energy Balance

- Initial potential energy: -336,777 J (negative because below ground)
- Launch kinetic energy: 80,435 J
- The system gains energy by falling toward zero level

This "works" in simulation but violates the spirit of trebuchet design (should start at ground level).

---

## Comparison With Unconstrained Champion

Recall the first champion (from extended search without constraints):

| Metric | Unconstrained Champion | Constrained Champion |
|--------|----------------------|---------------------|
| **Reported Range** | 20,096 ft | 562,366 ft |
| **Peak Force** | 4,505,720 lbf | 14,940 lbf |
| **Energy Conserved** | No (5% violated) | Yes |
| **Exploit Type** | Force spike | Range calculation bug |
| **Actual Range** | Unknown | ~1,760 ft |

**Both champions are simulation artifacts**, but via different exploits:
- **Unconstrained**: Exploits numerical instability to create massive forces
- **Constrained**: Exploits range calculation bug by starting underground

---

## Lessons Learned

### 1. Always Validate Fitness Function

**Problem**: Assumed `calculateRange` was correct
**Reality**: Has critical bug when projectile starts below ground

**Fix**: Audit fitness calculations for edge cases

### 2. Constraints Must Be Complete

**Missing constraints**:
- Particles must start above ground (Y ≥ 0)
- Projectile must travel some minimum distance horizontally
- Maximum simulation duration before termination
- Projectile must actually cross ground level at some point

### 3. Evolution Finds Every Loophole

**Observation**: The GA systematically searched for and found:
1. Exploit in unconstrained search: Force spikes
2. Exploit in constrained search: Range calculation bug

**Conclusion**: If there's a way to hack the fitness function, evolution WILL find it.

### 4. Incremental Exploitation

The GA didn't jump directly to the full exploit. It:
- Started with valid designs (0-28 ft)
- Gradually discovered the bug (gen 600)
- Iteratively refined the exploit (gen 600-1000)
- Ended at maximum exploitation (562,366 ft)

This demonstrates **gradient descent into the bug space**.

---

## What We Actually Found

### Constrained Search Results: FAILURE

- ✗ No valid champion discovered
- ✗ Reported champion is bug exploit
- ✗ Actual performance: 1,760 ft (ranks last)
- ✗ Constraints insufficient to prevent exploits

### The Real Best Constrained Design?

Looking at the early generations before exploitation:

- **Gen 600**: Best = 1,540.50 ft (likely valid)
- **Gen 500**: Best = 743.21 ft (valid)

These designs probably satisfy all INTENDED constraints (including starting above ground). The search should have stopped around gen 500-600.

---

## Fixes Required

### 1. Fix Range Calculation

```javascript
// Add validation
function calculateRange(trajectories, config) {
  // Ensure projectile starts above ground
  const initialY = -trajectories[0][2 * config.projectile + 1];
  if (initialY < 0) {
    return 0; // Invalid: starts underground
  }

  // Rest of calculation...
}
```

### 2. Add Ground-Level Constraint

```javascript
// In fitness evaluation
export function evaluateConstrainedTopology(config, maxForce = 15000) {
  // Check all particles start above ground
  for (const particle of config.particles) {
    if (particle.y < 0) {
      return { fitness: 0, reason: "underground_start" };
    }
  }

  // Rest of evaluation...
}
```

### 3. Add Sanity Checks

```javascript
// Reject physically implausible results
if (range > 50000) {  // 50,000 ft = 9.5 miles
  return { fitness: 0, reason: "implausible_range" };
}
```

---

## Corrected Constraints

For the next search iteration:

1. ✓ Peak force ≤ 15,000 lbf
2. ✓ Energy conservation (5% tolerance)
3. **NEW: All particles start above ground** (Y ≥ 0)
4. **NEW: Range ≤ 50,000 ft** (sanity check)
5. **NEW: Projectile must start above ground**
6. **NEW: Minimum particle mass ≥ 1 kg** (already implemented)

---

## Conclusions

### Main Findings

1. **✗ Constrained search FAILED** - champion is bug exploit
2. **✗ Reported range (562,366 ft) is garbage** - actual ~1,760 ft
3. **✓ Constraints reduced force exploitation** - 14,940 lbf vs 4.5M lbf
4. **✓ Energy conservation enforced successfully**
5. **✗ But evolution found a different exploit** - range calculation bug
6. **✓ Demonstrates need for comprehensive validation**

### The Real Champion

Among VALID designs with constraints:
- **Pulley Sling**: 6,298 ft (human design)
- **Fiffer**: 4,226 ft (human design)
- **F2k**: 3,858 ft (human design)

**Human designs still win** when bugs are fixed.

### Broader Implications

This is the **second failure** of computational design on this problem:
1. **First attempt**: Found design with impossible forces (simulation artifact)
2. **Second attempt**: Found design exploiting range calculation bug

**Pattern**: Evolution is very good at finding flaws in the evaluation pipeline, but this doesn't constitute genuine mechanical design.

### What Actually Works

The computational search successfully:
- ✓ Generates diverse topologies
- ✓ Optimizes within constraints (when complete)
- ✓ Respects force and energy limits (when specified)

But fails at:
- ✗ Respecting implicit physical constraints (ground level)
- ✗ Avoiding edge-case bugs in fitness calculation
- ✗ Distinguishing valid physics from numerical artifacts

### The Real Breakthrough?

**None yet.** Both searches found simulation artifacts, not genuine designs.

To succeed, we need:
1. **Fix all calculation bugs** (range, forces, energy)
2. **Add complete physical constraints** (ground level, reasonable limits)
3. **Validate every fitness evaluation** (sanity checks)
4. **Test top designs with multiple simulation methods**
5. **Filter out exploits before reporting results**

---

## Next Steps

### Immediate Actions

1. **Fix `calculateRange` function** - handle below-ground starts
2. **Add ground-level constraints** to mutation operators
3. **Add sanity check** - reject range > 50,000 ft
4. **Re-run constrained search** with fixes
5. **Manual validation** of top 10 results before reporting

### Research Questions

1. Can we find a **genuinely valid** computationally-discovered design?
2. What range is achievable with **realistic constraints**?
3. How to prevent evolution from exploiting **implicit assumptions**?
4. Should we use **multi-fidelity simulation** (coarse for search, fine for validation)?

---

## Final Assessment

### Constrained Champion

- **Status**: ❌ INVALID (bug exploit)
- **Reported range**: 562,366 ft (garbage)
- **Actual range**: ~1,760 ft (mediocre)
- **Rank**: Last among valid designs
- **Buildable**: No (starts underground)

### Search Process

- **Status**: ❌ FAILED
- **Reason**: Found calculation bug, not genuine design
- **Quality**: Constraints partially worked (forces, energy) but incomplete
- **Lessons**: Evolution finds every loophole

### Current State

**No computationally-discovered champion exists.** Both attempts (unconstrained and constrained) produced simulation artifacts.

**Human designs remain superior** when measured correctly.

---

*Analysis completed: 2025-11-25*
*Constrained search result: INVALID (bug exploit)*
*Actual champion range: ~1,760 ft (last place)*
*Exploit type: Range calculation bug via underground start*
*Status: CRITICAL BUG - Fix required before re-running ❌*
