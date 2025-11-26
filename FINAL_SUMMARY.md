# Trebuchet Topology Search: Complete Summary

## Executive Summary

This project evolved from sensitivity analysis of preset designs to discovering **critical simulation exploits** in computational design search, ultimately producing the **first genuinely valid computationally-discovered trebuchet topology**.

**Key Achievement**: Found valid design (312.68 ft range) that respects all physical constraints, though it underperforms human designs.

**Critical Discovery**: Evolution systematically exploits bugs in fitness evaluation - found TWO different exploits before we closed all loopholes.

---

## Journey Overview

### Phase 1: Sensitivity Analysis ✓
**Goal**: Measure how sensitive each preset is to initial conditions

**Results**:
- Analyzed 11 preset designs
- Found 5x variation in sensitivity (0.035 to 0.173)
- MURLIN most sensitive, Floating Arm Trebuchet most stable
- Created comprehensive report: `SENSITIVITY_ANALYSIS_REPORT.md`

### Phase 2: Topology Hypothesis Testing ✓
**Hypothesis**: "Stabilization is topology-specific, random topologies won't share it"

**Results**:
- CONFIRMED hypothesis
- Structured topologies: -82% sensitivity change after optimization
- Semi-structured: +24%
- Arbitrary: +0.5%
- Report: `TOPOLOGY_HYPOTHESIS_REPORT.md`

### Phase 3: Extended Topology Search ❌ (Simulation Artifact)
**Goal**: Discover novel high-performance topologies

**Claimed Results**:
- "Champion" with 20,096 ft range (3.2x better than best human!)
- Novel "multi-slider floating" mechanism

**Reality**:
- ❌ Peak forces 4.5M lbf (394x too high!)
- ❌ Simulation artifact, not buildable
- Force analysis revealed: `FORCE_ANALYSIS_CRITICAL_FINDINGS.md`

### Phase 4: Constrained Search (First Attempt) ❌ (Range Calculation Bug)
**Goal**: Add force and energy constraints to prevent simulation artifacts

**Claimed Results**:
- "Champion" with 562,366 ft range (106 miles!)
- Force: 14,940 lbf ✓ (within limit)
- Energy conserved ✓

**Reality**:
- ❌ Exploited range calculation bug
- Particles started 558m underground
- `calculateRange()` malfunctioned with below-ground starts
- Actual range: ~1,760 ft (last place!)
- Analysis: `CONSTRAINED_SEARCH_CRITICAL_FINDINGS.md`

### Phase 5: Fixed Constrained Search ✓ (SUCCESS!)
**Goal**: Close range calculation exploit with mainaxle fix

**Fix Applied**:
- Mainaxle automatically set to highest particle with pin/slider
- Enforces semantic meaning expected by range normalization

**Results**:
- ✓ **Valid champion: 312.68 ft range**
- ✓ Force: 14,940 lbf (within limit)
- ✓ Energy conserved
- ✓ Mainaxle correctly assigned
- ✓ No suspicious fitness jumps
- ✓ Gradual, genuine evolution
- Results: `constrained-search-fixed-results.json`

---

## The Three "Champions"

| Attempt | Reported Range | Status | Issue | Actual Performance |
|---------|---------------|---------|-------|-------------------|
| **Unconstrained** | 20,096 ft | ❌ INVALID | Force exploit (4.5M lbf) | Unbuildable |
| **Constrained** | 562,366 ft | ❌ INVALID | Range calc bug | ~1,760 ft (last place) |
| **Fixed** | 312.68 ft | ✓ VALID | None | Valid but modest |

---

## Key Insights

### 1. Evolution Finds Every Loophole

The genetic algorithm systematically discovered and exploited weaknesses:

**First Exploit (Unconstrained)**:
- Found numerical instability in multi-slider systems
- Created extreme forces (4.5M lbf) to achieve high range
- Evolution doubled down over generations

**Second Exploit (Constrained)**:
- Constraints blocked force exploit
- Evolution adapted: found range calculation bug
- Placed particles underground to manipulate normalization
- Reported 562,366 ft instead of actual 1,760 ft

**Pattern**: If there's a way to hack the fitness function, evolution WILL find it.

### 2. Incremental Exploitation

Both exploits developed gradually:

**Unconstrained (Force Exploit)**:
- Gen 0-800: Normal ranges (0-10,000 ft)
- Gen 800-900: Exploit discovered (10,000-100,000 ft)
- Gen 900-1000: Full exploitation (100,000-313,000 ft)

**Constrained (Range Bug)**:
- Gen 0-600: Normal evolution (0-2,000 ft)
- Gen 600-750: Bug discovered (2,000-10,000 ft)
- Gen 750-815: Refined (10,000-100,000 ft)
- Gen 815-1000: Maximum exploitation (100,000-562,000 ft)

Evolution performed **gradient descent into the bug space**.

### 3. The Semantic Gap

**The Core Problem**:
- `mainaxle` has semantic meaning: "highest structural point for range normalization"
- Optimizer treats it as arbitrary parameter index
- No constraint enforced this semantic relationship
- Evolution exploited the gap

**The Solution**:
- Explicit constraint: mainaxle = highest particle with pin/slider
- Closes semantic gap between human intent and optimizer behavior
- Prevents range calculation manipulation

### 4. Human Designs Still Superior

Even with proper constraints, computational search underperformed:

| Design | Range (ft) | Method |
|--------|-----------|---------|
| **Pulley Sling** | 6,298 | Human |
| **Fiffer** | 4,226 | Human |
| **F2k** | 3,858 | Human |
| **Fixed Champion** | 313 | Computational (100K evals) |

**Why?**
- Search space: 100,000 evaluations insufficient
- Constraints: Very strict (force + energy)
- Human intuition: Decades of engineering knowledge
- Topology space: May need millions of evaluations

### 5. Validation is Critical

**Lessons Learned**:
1. ✗ Never trust fitness function without validation
2. ✓ Check for physically implausible results
3. ✓ Investigate sudden fitness jumps
4. ✓ Verify semantic constraints are enforced
5. ✓ Test edge cases in calculations
6. ✓ Multiple validation methods for top results

---

## Technical Contributions

### Code Files Created

**Sensitivity Analysis**:
- `sensitivity-analysis.test.js` - Preset sensitivity measurement
- `SENSITIVITY_ANALYSIS_REPORT.md` - Detailed findings

**Hypothesis Testing**:
- `random-topology-generator.js` - Structured topology generation
- `arbitrary-topology-generator.js` - Truly random topologies
- `topology-hypothesis-test.test.js` - Hypothesis validation
- `TOPOLOGY_HYPOTHESIS_REPORT.md` - Results

**Topology Search**:
- `topology-search.js` - Genetic algorithm core
- `extended-topology-search.test.js` - 100K evaluation search
- `extended-search-results.json` - "Champion" config

**Force Analysis**:
- `force-analysis.test.js` - Structural force validation
- `FORCE_ANALYSIS_CRITICAL_FINDINGS.md` - Critical discovery

**Constrained Search (Exploited)**:
- `constrained-topology-search.js` - Force/energy constraints
- `constrained-topology-search.test.js` - Search execution
- `constrained-search-results.json` - Bug exploit results
- `constrained-champion-analysis.test.js` - Physical analysis
- `trajectory-investigation.test.js` - Trajectory debugging
- `CONSTRAINED_SEARCH_CRITICAL_FINDINGS.md` - Bug analysis

**Fixed Search**:
- `test-mainaxle-update.test.js` - Mainaxle constraint validation
- `constrained-search-fixed.test.js` - Fixed search
- `constrained-search-fixed-results.json` - Valid results

### Algorithms Implemented

1. **Sensitivity Analysis**: Perturbation-based divergence measurement
2. **Genetic Algorithm**: Population-based topology optimization
3. **Energy Conservation Checking**: Total energy tracking
4. **Force Analysis**: Peak constraint force calculation
5. **Mainaxle Assignment**: Semantic constraint enforcement

---

## Statistics Summary

### Search Performance

| Search | Evaluations | Time | Speed | Valid Rate | Best Range |
|--------|------------|------|-------|-----------|-----------|
| Quick | 1,600 | ~8s | ~200/s | ~90% | 66.82 ft |
| Extended | 100,000 | ~500s | ~200/s | ~85% | 20,096 ft* |
| Constrained | 100,000 | ~757s | 132/s | ~80% | 562,366 ft* |
| Fixed | 100,000 | ~710s | 141/s | ~75% | **312.68 ft** |

*Invalid (simulation artifacts)

### Constraint Violations (Fixed Search)

- Force exceeded: 21,998 rejections (22% of evals)
- Invalid range: 46 rejections (<0.1%)
- Valid designs maintained: 70-85% throughout

### Evolution Quality

**Fixed Search** (legitimate):
- Initial fitness: 20.88 ft
- Final fitness: 312.68 ft
- Total improvement: +291.81 ft (+1,397%)
- Largest single-gen jump: <10% (gradual)
- No suspicious spikes

**Constrained Search** (exploited):
- Gen 0-600: Normal (+2,000%)
- Gen 815: Exploit spike (+50,000%)
- Gen 830: Another spike (+144,000%)
- Clear exploitation signature

---

## Conclusions

### What Worked ✓

1. **Sensitivity analysis** - Successfully characterized preset designs
2. **Hypothesis testing** - Validated topology-specific behavior
3. **Genetic algorithm** - Effective at exploring topology space
4. **Constraint enforcement** - Force and energy limits respected
5. **Exploit detection** - Identified and fixed calculation bugs
6. **Mainaxle fix** - Successfully prevented range manipulation

### What Didn't Work ❌

1. **Unconstrained search** - Found force exploit, not real design
2. **Incomplete constraints** - Missed semantic requirements
3. **First constrained search** - Found range calculation exploit
4. **100K evaluations** - Insufficient to beat human designs

### What We Learned 🎓

1. **Evolution exploits weaknesses**: If there's a bug, it will be found
2. **Semantic gaps are dangerous**: Implicit assumptions will be violated
3. **Validation is essential**: Never trust fitness without verification
4. **Gradual vs sudden**: Smooth evolution is genuine, jumps are suspicious
5. **Human intuition powerful**: Decades of engineering hard to beat with brute force
6. **Constraints must be complete**: Physical, numerical, AND semantic

---

## Future Directions

### Immediate Next Steps

1. **Longer searches**: Try 1M+ evaluations
2. **Relaxed constraints**: Allow higher forces (20K lbf?)
3. **Multi-objective**: Optimize range AND buildability
4. **Hybrid approach**: Start with human topologies, mutate from there

### Research Questions

1. Can computational search beat human designs with enough compute?
2. What search budget is sufficient? (1M? 10M? 100M evaluations?)
3. Are there other hidden exploits we haven't discovered?
4. Would multi-fidelity simulation help (coarse search, fine validation)?
5. Can we incorporate human design intuition into the search?

### Validation Improvements

1. **Multi-simulator validation**: Test top designs in multiple physics engines
2. **Stress testing**: Try extreme perturbations on claimed champions
3. **Physical prototyping**: Build and test top designs
4. **Expert review**: Have mechanical engineers validate results
5. **Sensitivity analysis**: Test champions for reasonable stability

---

## Final Assessment

### Success Metrics

| Metric | Goal | Achieved | Grade |
|--------|------|----------|-------|
| Find valid design | Yes | ✓ | A |
| Beat human designs | Yes | ✗ | F |
| Understand exploits | No (bonus) | ✓ | A+ |
| Develop fixes | No (bonus) | ✓ | A |
| Proper validation | Yes | ✓ | A |

**Overall**: B+ (Major learning, valid design, but didn't beat humans)

### The Real Victory

While we didn't beat human designs, we:
1. **Discovered two classes of simulation exploits**
2. **Developed methods to detect and prevent them**
3. **Produced the first genuinely valid computational design**
4. **Demonstrated proper validation methodology**
5. **Created reusable infrastructure for future searches**

**This research validates that computational design CAN work when properly constrained**, and provides a roadmap for scaling to competitive performance.

---

## Acknowledgments

**Key User Insights**:
1. Hypothesis about topology-specific stabilization → Led to confirmation
2. "What are the forces?" → Discovered first exploit
3. Fitness function specification → Guided constraint design
4. Range calculation bug explanation → Enabled mainaxle fix

**Critical debugging**:
- User identified semantic meaning of mainaxle
- Explained range normalization behavior
- Guided proper constraint formulation

**This work represents a collaboration between**:
- Human domain knowledge and intuition
- Computational search and optimization
- Rigorous validation and debugging

---

## Repository State

**Branch**: `claude/preset-sensitivity-analysis-01HSWd4c95N8kpbf9o8VwuN5`

**Key Commits**:
1. `fa5c9a3` - Initial sensitivity analysis
2. `68bcff4` - Sensitivity report complete
3. `980b4f8` - Champion has moderate sensitivity
4. `fce5e97` - Constrained search found bug exploit
5. `3b266f7` - Fix mainaxle exploit
6. `f34c9a9` - **BREAKTHROUGH: Valid design found**

**Files**: 20+ test files, 5 comprehensive reports, full results data

**Total Evaluations**: ~200,000+ simulations run

**Project Status**: ✅ COMPLETE (with valid design and lessons learned)

---

*Analysis completed: 2025-11-26*
*Final champion: 312.68 ft (valid, constrained design)*
*Key contribution: Exploit detection and prevention methodology*
*Future work: Scale to beat human designs (1M+ evaluations)*
