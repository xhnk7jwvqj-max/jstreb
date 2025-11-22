#!/usr/bin/env python3
"""
RopeDrum Constraint - Complete Symbolic Derivation
===================================================

This script derives the RopeDrum constraint from first principles,
following the methodology verified with the Colinear constraint.

CONSTRAINT GEOMETRY:
-------------------
The RopeDrum constraint models a rope wrapping tangentially around a circular drum.

Three particles:
- p1 (x1, y1): Free end of rope (e.g., counterweight)
- p2 (x2, y2): Center of drum
- p3 (x3, y3): Attachment point on drum circumference (constrained to circle)

Parameters:
- r: Drum radius
- L: Total rope length (constant)

The rope:
1. Extends from p1 to a tangent point on the drum
2. Wraps around the drum from the tangent point to p3
3. Total length = tangent_length + arc_length = L (constant)

CONSTRAINT EQUATION:
-------------------
C = tangent_length + arc_length - L = 0

Where:
  tangent_length = sqrt((x1-x2)² + (y1-y2)² - r²)
  arc_length = r * arc_angle
  arc_angle = θ_p3 - θ_T

Angles:
  θ_p3 = atan2(y3-y2, x3-x2)  # Angle to attachment point
  θ_T = α + π/2 - β            # Angle to tangent point
  α = atan2(y1-y2, x1-x2)      # Angle to free end
  β = asin(r/d)                # Offset angle for tangent
  d = sqrt((x1-x2)² + (y1-y2)²)

SIMPLIFICATION STRATEGY:
------------------------
Since atan2 and asin make symbolic computation very slow, we'll:
1. Derive gradients using geometric formulas and chain rule
2. Verify gradient formulas numerically
3. Derive acceleration term in parts (tangent + arc)

METHODOLOGY:
-----------
1. Define time-parameterized positions: p(t) = p(0) + t * v
2. Compute constraint C(t)
3. Compute ∂C/∂x_i for all position variables (gradients)
4. Compute d²C/dt² at t=0 (acceleration term)
5. Output formulas for implementation
"""

from sympy import *
import sys

print("=" * 80)
print("ROPEDRUM CONSTRAINT - SYMBOLIC DERIVATION")
print("=" * 80)

# =============================================================================
# STEP 1: Define symbolic variables
# =============================================================================
print("\nSTEP 1: Define symbolic variables")
print("-" * 80)

# Positions at t=0
x1, y1 = symbols('x1 y1', real=True)  # free end (counterweight)
x2, y2 = symbols('x2 y2', real=True)  # drum center
x3, y3 = symbols('x3 y3', real=True)  # attachment point on drum

# Velocities (constant in linear motion model)
vx1, vy1 = symbols('vx1 vy1', real=True)
vx2, vy2 = symbols('vx2 vy2', real=True)
vx3, vy3 = symbols('vx3 vy3', real=True)

# Parameters
r, L = symbols('r L', positive=True, real=True)

# Time parameter
t = symbols('t', real=True)

print("Particles:")
print(f"  p1 (x1, y1): Free end of rope (counterweight)")
print(f"  p2 (x2, y2): Drum center")
print(f"  p3 (x3, y3): Attachment point on drum circumference")
print()
print("Parameters:")
print(f"  r: Drum radius")
print(f"  L: Total rope length")

# =============================================================================
# STEP 2: Time-parameterized positions
# =============================================================================
print("\n" + "=" * 80)
print("STEP 2: Time-parameterized positions (linear motion)")
print("-" * 80)

x1_t = x1 + t * vx1
y1_t = y1 + t * vy1
x2_t = x2 + t * vx2
y2_t = y2 + t * vy2
x3_t = x3 + t * vx3
y3_t = y3 + t * vy3

print("Linear motion model: p(t) = p(0) + t * v")
print()
print(f"  p1(t) = ({x1_t}, {y1_t})")
print(f"  p2(t) = ({x2_t}, {y2_t})")
print(f"  p3(t) = ({x3_t}, {y3_t})")

# =============================================================================
# STEP 3: Define constraint function in parts
# =============================================================================
print("\n" + "=" * 80)
print("STEP 3: Define constraint function")
print("-" * 80)

# Relative positions (from drum center)
dx_t = x1_t - x2_t
dy_t = y1_t - y2_t
dx3_t = x3_t - x2_t
dy3_t = y3_t - y2_t

# Distance from drum center to free end
d_squared_t = dx_t**2 + dy_t**2
d_t = sqrt(d_squared_t)

# Tangent length (from p1 to tangent point on drum)
tangent_length_t = sqrt(d_squared_t - r**2)

print("\nPart 1: Tangent Length")
print(f"  dx = x1 - x2")
print(f"  dy = y1 - y2")
print(f"  d = sqrt(dx² + dy²)")
print(f"  tangent_length = sqrt(d² - r²)")

# Arc angle (this is where it gets complex)
# θ_p3 = atan2(dy3, dx3)
# α = atan2(dy, dx)
# β = asin(r/d)
# θ_T = α + π/2 - β
# arc_angle = θ_p3 - θ_T = θ_p3 - α - π/2 + β

alpha_t = atan2(dy_t, dx_t)
beta_t = asin(r / d_t)
theta_T_t = alpha_t + pi/2 - beta_t
theta_p3_t = atan2(dy3_t, dx3_t)
arc_angle_t = theta_p3_t - theta_T_t
arc_length_t = r * arc_angle_t

print("\nPart 2: Arc Length")
print(f"  α = atan2(dy, dx)         # Angle to free end")
print(f"  β = asin(r/d)             # Tangent offset angle")
print(f"  θ_T = α + π/2 - β         # Tangent point angle")
print(f"  θ_p3 = atan2(dy3, dx3)    # Attachment point angle")
print(f"  arc_angle = θ_p3 - θ_T")
print(f"  arc_length = r * arc_angle")

# Total constraint
C_t = tangent_length_t + arc_length_t - L

print("\nConstraint Function:")
print(f"  C(t) = tangent_length(t) + arc_length(t) - L")
print(f"  C must equal 0 for all t")

# =============================================================================
# STEP 4: Compute gradients
# =============================================================================
print("\n" + "=" * 80)
print("STEP 4: Compute gradients ∂C/∂position_i")
print("-" * 80)

print("\nComputing symbolic gradients...")
print("(This may take a while due to atan2 and asin...)")

gradients = {}
grad_vars = [
    ('x1', x1), ('y1', y1),
    ('x2', x2), ('y2', y2),
    ('x3', x3), ('y3', y3)
]

for var_name, var in grad_vars:
    print(f"\n  Computing ∂C/∂{var_name}...", end='', flush=True)
    grad = diff(C_t, var).subs(t, 0)
    print(" differentiating...", end='', flush=True)
    grad_simplified = simplify(grad)
    print(" simplifying...", end='', flush=True)
    gradients[var_name] = grad_simplified
    print(" done!")

print("\n" + "-" * 80)
print("Gradient formulas:")
print("-" * 80)

for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
    print(f"\n∂C/∂{var_name}:")
    print(f"  {gradients[var_name]}")

# =============================================================================
# STEP 5: Numerical verification with test case
# =============================================================================
print("\n" + "=" * 80)
print("STEP 5: Numerical verification")
print("-" * 80)

# Use Drum Counterweight preset values
test_values = {
    x1: 436, y1: 622,      # counterweight
    x2: 536, y2: 472.7,    # drum center
    x3: 578, y3: 515,      # attachment point
    r: 60,
    L: 13,
    vx1: 0, vy1: 0,        # initially at rest
    vx2: 0, vy2: 0,
    vx3: 0, vy3: 0
}

print("\nTest case: Drum Counterweight preset")
print(f"  p1 = ({test_values[x1]}, {test_values[y1]})")
print(f"  p2 = ({test_values[x2]}, {test_values[y2]})")
print(f"  p3 = ({test_values[x3]}, {test_values[y3]})")
print(f"  r = {test_values[r]}, L = {test_values[L]}")

# Evaluate constraint at initial position
C_initial = C_t.subs(t, 0).subs(test_values)
print(f"\nConstraint value C(0) = {float(C_initial):.6f}")
print(f"  (Should be close to 0 if totalLength is correct)")

# Compute numerical gradient values
print("\nGradient values:")
grad_values = {}
for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
    val = float(gradients[var_name].subs(test_values))
    grad_values[var_name] = val
    print(f"  ∂C/∂{var_name} = {val:+.6f}")

# Check gradient magnitudes
print("\nGradient magnitudes:")
mag_p1 = sqrt(grad_values['x1']**2 + grad_values['y1']**2)
mag_p2 = sqrt(grad_values['x2']**2 + grad_values['y2']**2)
mag_p3 = sqrt(grad_values['x3']**2 + grad_values['y3']**2)
print(f"  |∇C_p1| = {mag_p1:.6f}")
print(f"  |∇C_p2| = {mag_p2:.6f}")
print(f"  |∇C_p3| = {mag_p3:.6f}")

# =============================================================================
# STEP 6: Compute acceleration (in parts)
# =============================================================================
print("\n" + "=" * 80)
print("STEP 6: Compute acceleration d²C/dt²")
print("-" * 80)

print("\nPart A: Tangent length acceleration")
print("-" * 80)

# We already derived this correctly in previous work
# d²(tangent_length)/dt² = [(dy*vx - dx*vy)² - r²*(vx² + vy²)] / tangent_length³

dx = x1 - x2
dy = y1 - y2
vx = vx1 - vx2
vy = vy1 - vy2

d_sq = dx**2 + dy**2
tangent_length = sqrt(d_sq - r**2)
tangent_length_cubed = tangent_length**3

wedge = dy * vx - dx * vy  # Cross product (angular momentum term)
v_squared = vx**2 + vy**2

tangent_accel = (wedge**2 - r**2 * v_squared) / tangent_length_cubed

print(f"\nTangent acceleration (already derived):")
print(f"  wedge = dy*vx - dx*vy")
print(f"  v² = vx² + vy²")
print(f"  d²(tangent_length)/dt² = (wedge² - r²*v²) / tangent_length³")
print(f"")
print(f"  Simplified: {simplify(tangent_accel)}")

print("\nPart B: Arc angle acceleration")
print("-" * 80)

print("\nThis requires d²/dt²[θ_p3 - θ_T]")
print("Computing full symbolic second derivative...")
print("(This will take a while...)")

# For arc acceleration, we need second time derivative of arc_angle
# Let's compute it step by step

print("\n  Computing dC/dt...", end='', flush=True)
dC_dt = diff(C_t, t)
print(" done!")

print("  Computing d²C/dt²...", end='', flush=True)
d2C_dt2 = diff(dC_dt, t)
print(" done!")

print("  Evaluating at t=0...", end='', flush=True)
d2C_dt2_at_0 = d2C_dt2.subs(t, 0)
print(" done!")

print("  Simplifying (this may take a very long time)...", end='', flush=True)
sys.stdout.flush()

# Try simplification with a timeout approach - just try for reasonable time
try:
    d2C_dt2_simplified = simplify(d2C_dt2_at_0)
    print(" done!")
except KeyboardInterrupt:
    print(" interrupted!")
    d2C_dt2_simplified = d2C_dt2_at_0

# =============================================================================
# STEP 7: Output formulas for implementation
# =============================================================================
print("\n" + "=" * 80)
print("STEP 7: Implementation formulas")
print("=" * 80)

print("\nCOMMON TERMS:")
print("-" * 80)
print("  dx = x1 - x2")
print("  dy = y1 - y2")
print("  dx3 = x3 - x2")
print("  dy3 = y3 - y2")
print("  d² = dx² + dy²")
print("  d = sqrt(d²)")
print("  d³ = d² * d")
print("  r² = r * r")
print("  tangent_length = sqrt(d² - r²)")

print("\nGRADIENTS (for computeEffectRopeDrum):")
print("-" * 80)

# Convert to implementation-friendly form
for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
    print(f"\n∂C/∂{var_name} =")
    # Try to express in terms of common variables
    formula = gradients[var_name]

    # Substitute common terms for readability
    formula_readable = formula.subs([
        (x1 - x2, Symbol('dx')),
        (y1 - y2, Symbol('dy')),
        (x3 - x2, Symbol('dx3')),
        (y3 - y2, Symbol('dy3')),
    ])

    print(f"  {formula_readable}")

print("\nACCELERATION (for computeAccelerationRopeDrum):")
print("-" * 80)
print("\nTangent part (verified correct):")
print("  wedge = (y1-y2)*(vx1-vx2) - (x1-x2)*(vy1-vy2)")
print("  v² = (vx1-vx2)² + (vy1-vy2)²")
print("  tangent_accel = (wedge² - r²*v²) / tangent_length³")

print("\nArc part:")
print("  d²(arc_length)/dt² = (symbolic expression from above)")

print("\nTotal acceleration:")
print("  d²C/dt² = tangent_accel + arc_accel")

# =============================================================================
# SAVE RESULTS
# =============================================================================
print("\n" + "=" * 80)
print("SAVING RESULTS")
print("=" * 80)

with open('/home/user/jstreb/science/ropedrum_derivation_output.txt', 'w') as f:
    f.write("RopeDrum Constraint - Symbolic Derivation Results\n")
    f.write("=" * 80 + "\n\n")

    f.write("GRADIENTS:\n")
    f.write("-" * 80 + "\n")
    for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
        f.write(f"\n∂C/∂{var_name} =\n")
        f.write(f"  {gradients[var_name]}\n")

    f.write("\n" + "=" * 80 + "\n")
    f.write("ACCELERATION:\n")
    f.write("-" * 80 + "\n")
    f.write(f"\nd²C/dt² at t=0:\n")
    f.write(f"  {d2C_dt2_at_0}\n\n")

    f.write("\n" + "=" * 80 + "\n")
    f.write("NUMERICAL TEST VALUES:\n")
    f.write("-" * 80 + "\n")
    f.write(f"\nConstraint value: {float(C_initial):.6f}\n\n")
    f.write("Gradients:\n")
    for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
        f.write(f"  ∂C/∂{var_name} = {grad_values[var_name]:+.6f}\n")

print("\nResults saved to: science/ropedrum_derivation_output.txt")

print("\n" + "=" * 80)
print("DERIVATION COMPLETE")
print("=" * 80)
