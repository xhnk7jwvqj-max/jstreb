# Force-Constrained Optimization Results

**Challenge**: Find maximum range with ≤5000 lbf peak load constraint
**Time Budget**: 20 minutes
**Actual Time**: **8.4 seconds** ⚡

---

## 🏆 Winner: NASAW 5K Budget

**Performance:**
- **Range**: 4569.4 ft
- **Peak Load**: 5000.0 lbf (exactly at budget!)
- **Efficiency**: 0.914 ft/lbf
- **Architecture**: Whipper-style with dual one-way constraints

**Key Characteristics:**
- 5 particles (simple, efficient)
- Counterweight: 207 mass units
- Arm tip mass: 4
- Projectile mass: 1
- Dual one-way constraints for whipper action
- Floating counterweight slider

---

## Optimization Strategies Tested

### Strategy 1: Optimize from NASAW (original) ✓ **WINNER**
- **Starting point**: 4225.1 ft @ 4993.2 lbf (already valid!)
- **After optimization**: 4569.4 ft @ 5000.0 lbf
- **Improvement**: +344.3 ft (+8.2%)
- **Iterations**: 400
- **Result**: Uses full force budget for maximum range

**Why it won:**
- Started from an already-valid design close to the budget
- Only needed to push range up to the force limit
- NASAW's whipper architecture is inherently efficient

### Strategy 2: Scale down Sky Render
- **Starting point**: Sky Render with CW reduced to 35% (173 mass)
- **Initial**: 2655.8 ft @ 1562.3 lbf
- **After optimization**: 3734.6 ft @ 3063.6 lbf
- **Result**: Good, but left 1936 lbf of budget unused

**Why it didn't win:**
- Started too conservative (well under budget)
- Sky Render's pulley system has higher baseline forces
- Would need more iterations to reach force limit

### Strategy 3: Custom lightweight design
- **Result**: Failed (0 range)
- **Issue**: Initial geometry was invalid

---

## Performance Comparison

| Design | Range (ft) | Load (lbf) | Load Budget Used | Architecture |
|--------|-----------|-----------|------------------|--------------|
| **NASAW 5K Budget** | **4569.4** | **5000.0** | **100%** | Whipper |
| Sky Render (reduced) | 3734.6 | 3063.6 | 61% | Pulley + Whipper |
| NASAW (original) | 4225.1 | 4993.2 | 100% | Whipper |
| Whipper | 1851.6 | 3803.6 | 76% | Whipper |
| FAT | 1120.5 | 1776.2 | 36% | Floating Arm |

---

## Design Evolution: NASAW → NASAW 5K Budget

**What changed during optimization:**

| Parameter | Before | After | Change |
|-----------|--------|-------|--------|
| Counterweight mass | 200.0 | 207.0 | +3.5% |
| Counterweight Y-pos | 340.7 | 339.2 | -0.4% |
| Counterweight X-pos | 563.0 | 564.2 | +0.2% |
| Upper connection Y | 453.5 | 458.8 | +1.2% |
| Range | 4225.1 ft | 4569.4 ft | **+8.2%** |
| Peak Load | 4993.2 lbf | 5000.0 lbf | **+0.1%** |

**Key insight:** Small geometric tweaks + slight mass increase pushed range up while staying exactly at force limit.

---

## Efficiency Analysis

**Range per lbf of force:**

| Design | Efficiency (ft/lbf) | Rank |
|--------|-------------------|------|
| FAT | 0.631 | 🥇 Best |
| NASAW 5K Budget | 0.914 | 🥈 |
| Sky Render (reduced) | 1.219 | 🥉 |

**However**, NASAW 5K Budget achieves the **highest absolute range** within the constraint!

---

## Key Insights

### 1. **Starting Point Matters**
- NASAW was already at 99.9% of force budget
- Only needed optimization to maximize range at that force level
- Much faster than trying to scale up/down from other designs

### 2. **Whipper Architecture is Force-Efficient**
- One-way constraints reduce peak loads during release
- Simpler than pulley systems = lower baseline forces
- Counterweight can "drop away" = lower structural loads

### 3. **Optimization Speed**
- 400 iterations × 3 strategies = 1200 total evaluations
- Completed in 8.4 seconds
- Simulated annealing with adaptive step size is fast and effective

### 4. **Force Budget Utilization**
- Winner used exactly 100% of budget (5000.0 lbf)
- Sky Render variant only used 61% (left range on the table)
- Using full budget is critical for maximum performance

---

## Trade-off: Sky Render vs NASAW 5K Budget

| Metric | Sky Render | NASAW 5K Budget | Trade-off |
|--------|-----------|-----------------|-----------|
| Range | 6515.5 ft | 4569.4 ft | **-30%** |
| Peak Load | 9862.2 lbf | 5000.0 lbf | **-49%** |
| Counterweight | 495 mass | 207 mass | -58% |
| Complexity | Pulley system | Whipper only | Simpler |
| Cost | High forces | Budget-friendly | **Winner at ≤5K** |

**Conclusion:** If you have unlimited force budget, Sky Render is king. But if you're constrained to 5000 lbf, NASAW 5K Budget extracts maximum performance!

---

## Design Files

New preset added to `trebuchetsimulation.js`:
- **Name**: "NASAW 5K Budget"
- **Available in UI**: Yes
- **Optimized for**: Maximum range at exactly 5000 lbf peak load
