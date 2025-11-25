# Trebuchet Preset Sensitivity Analysis Report

## Executive Summary

This report analyzes how sensitive each trebuchet preset is to initial conditions. Sensitivity to initial conditions is a hallmark of chaotic dynamical systems, where small changes in starting positions can lead to dramatically different outcomes over time.

## Methodology

For each preset configuration, we:
1. Ran a baseline simulation with the default initial conditions
2. Created 5 perturbed versions with small random position changes (±0.01 units)
3. Measured how trajectories diverged over time using Euclidean distance metrics
4. Calculated sensitivity metrics including growth rate and doubling time

### Key Metrics

- **Growth Rate**: The exponential rate at which trajectories diverge (per second). Higher values indicate greater sensitivity to initial conditions.
- **Max Divergence**: The maximum position difference observed during the simulation
- **Final Divergence**: The position difference at the end of the simulation
- **Doubling Time**: The time it takes for the divergence to double from its initial value

## Results

### Sensitivity Rankings (Most to Least Sensitive)

| Rank | Preset Name | Growth Rate | Max Divergence | Final Divergence | Doubling Time |
|------|-------------|-------------|----------------|------------------|---------------|
| 1 | **MURLIN** | 0.1728 | 31.507 | 29.695 | 17.04s |
| 2 | **Fiffer** | 0.1062 | 0.212 | 0.209 | 15.16s |
| 3 | **Floating Arm King Arthur** | 0.0892 | 0.847 | 0.785 | 23.12s |
| 4 | **Pulley Sling** | 0.0768 | 0.517 | 0.355 | 16.24s |
| 5 | **Floating Arm Whipper (NASAW)** | 0.0745 | 0.406 | 0.379 | 24.04s |
| 6 | **Whipper** | 0.0578 | 1.325 | 0.810 | 20.40s |
| 7 | **Hinged Counterweight** | 0.0576 | 0.141 | 0.140 | 18.30s |
| 8 | **Launch Ness Monster** | 0.0504 | 3.733 | 1.790 | 30.18s |
| 9 | **F2k** | 0.0466 | 0.116 | 0.088 | 24.72s |
| 10 | **Fixed Counterweight** | 0.0358 | 0.064 | 0.063 | 19.38s |
| 11 | **Floating Arm Trebuchet** | 0.0354 | 0.087 | 0.059 | 19.68s |

## Detailed Analysis

### Highly Sensitive Presets (Growth Rate > 0.10)

#### 1. MURLIN (Growth Rate: 0.1728)
**Most Sensitive Configuration**

MURLIN demonstrates exceptional sensitivity to initial conditions with a growth rate nearly 5x higher than the least sensitive preset. This design features:
- Complex rope and pulley system with multiple pulleys
- Intricate constraint interactions
- The highest maximum divergence (31.5 units) of all presets

**Implications**: Small manufacturing tolerances or setup variations will have significant impact on performance. Requires precise construction and careful alignment.

#### 2. Fiffer (Growth Rate: 0.1062)
**Second Most Sensitive**

The Fiffer shows high sensitivity with the fastest doubling time (15.16s). This design is characterized by:
- Multiple interconnected rigid bodies
- Complex slider constraints
- Rapid divergence behavior

**Implications**: Performance prediction is difficult; repeated launches may show considerable variation even with seemingly identical setup.

### Moderately Sensitive Presets (Growth Rate: 0.05-0.10)

#### 3-7: Floating Arm King Arthur, Pulley Sling, Floating Arm Whipper, Whipper, Hinged Counterweight

These designs exhibit moderate sensitivity. They will show some variation in performance with small setup changes, but behavior is more predictable than the highly sensitive designs.

- **Floating Arm King Arthur** and **Pulley Sling** show notable divergence in final positions
- **Whipper** designs demonstrate interesting dynamics with moderate sensitivity
- **Hinged Counterweight** (the classic design) shows middle-of-the-road sensitivity

**Implications**: These designs offer a balance between performance variability and predictability. Setup precision matters but isn't as critical as for highly sensitive designs.

### Low Sensitivity Presets (Growth Rate < 0.05)

#### 8-11: Launch Ness Monster, F2k, Fixed Counterweight, Floating Arm Trebuchet

**Most Stable Configurations**

These designs are relatively insensitive to initial conditions:

- **Floating Arm Trebuchet** (Growth Rate: 0.0354) - Most stable design
- **Fixed Counterweight** (Growth Rate: 0.0358) - Second most stable
- **F2k** and **Launch Ness Monster** - Also show low sensitivity

**Implications**: These designs are ideal for applications requiring consistent, repeatable performance. Manufacturing tolerances have minimal impact on outcomes.

## Practical Implications

### For Competition Builders
- **Choose low-sensitivity designs** (Floating Arm Trebuchet, Fixed Counterweight) for consistent scoring
- Avoid high-sensitivity designs unless you can achieve very tight tolerances
- MURLIN and Fiffer require exceptional precision to achieve predictable results

### For Education and Demonstration
- **Moderate sensitivity designs** (Hinged Counterweight, Whipper) provide interesting variation without being too unpredictable
- High-sensitivity designs can demonstrate chaos theory concepts effectively

### For Research and Development
- High-sensitivity designs (MURLIN, Fiffer) may offer optimization opportunities if precision can be achieved
- Low-sensitivity designs provide stable baselines for component testing

## Physical Interpretation

### Why Do Some Designs Show Higher Sensitivity?

1. **Complex Constraint Systems**: Designs with ropes, pulleys, and multiple sliding joints (MURLIN, Pulley Sling) show higher sensitivity due to:
   - Nonlinear constraint interactions
   - Coupled degrees of freedom
   - Sensitivity to constraint release timing

2. **Multiple Hinged Bodies**: Designs with many interconnected rigid bodies (Fiffer) exhibit:
   - Cascading error propagation
   - Amplification through lever arms
   - Phase-sensitive behavior

3. **Simpler Mechanisms**: Designs with fewer degrees of freedom (Fixed Counterweight, Floating Arm Trebuchet) show:
   - More deterministic trajectories
   - Less opportunity for divergence
   - Fewer nonlinear interactions

## Recommendations

1. **For Precision Applications**: Use Floating Arm Trebuchet or Fixed Counterweight designs
2. **For Maximum Performance**: Consider that high-sensitivity designs may offer higher peak performance but with less consistency
3. **For Experimentation**: MURLIN and Fiffer offer rich dynamics for studying chaotic behavior
4. **For Reliability**: Avoid MURLIN unless exceptional manufacturing precision is available

## Technical Notes

- All simulations used a perturbation size of ±0.01 units
- Each preset was tested with 5 independent random perturbations
- Growth rates represent the exponential divergence coefficient (per second)
- Simulations were run for each preset's configured duration with its specified timestep

## Conclusion

This sensitivity analysis reveals a wide spectrum of behaviors across trebuchet designs, from highly chaotic (MURLIN, Fiffer) to relatively stable (Floating Arm Trebuchet, Fixed Counterweight). The choice of design should be informed by the application's requirements for consistency versus potential performance optimization, and the achievable manufacturing precision.

The ~5x difference in growth rates between the most and least sensitive designs demonstrates that mechanical configuration has a profound impact on system predictability. This has important implications for design selection, manufacturing tolerances, and performance expectations.

---

*Report generated by automated sensitivity analysis testing*
*Date: 2025-11-25*
*Test file: sensitivity-analysis.test.js*
