#!/usr/bin/env python3
"""
Complete symbolic derivation for RopeDrum constraint
Following the methodology from Roller Constraint Math.ipynb

The constraint: tangent_length + arc_length - total_length = 0

Where:
- p1 (x1, y1) = free end of rope (counterweight)
- p2 (x2, y2) = drum center
- p3 (x3, y3) = attachment point on drum circumference
- r = drum radius
- L = total rope length
"""

from sympy import *

# Define symbols
# Positions
x1, y1, x2, y2, x3, y3 = symbols('x1 y1 x2 y2 x3 y3', real=True)
# Velocities
vx1, vy1, vx2, vy2, vx3, vy3 = symbols('vx1 vy1 vx2 vy2 vx3 vy3', real=True)
# Parameters
r, L = symbols('r L', positive=True, real=True)
# Time parameter
t = symbols('t', real=True)

print("=" * 80)
print("RopeDrum Constraint Symbolic Derivation")
print("=" * 80)

# Time-parameterized positions (linear motion)
x1_t = x1 + t * vx1
y1_t = y1 + t * vy1
x2_t = x2 + t * vx2
y2_t = y2 + t * vy2
x3_t = x3 + t * vx3
y3_t = y3 + t * vy3

# Vector from p2 to p1
dx = x1_t - x2_t
dy = y1_t - y2_t
d_squared = dx**2 + dy**2
d = sqrt(d_squared)

# Tangent length (from p1 to tangent point on drum)
tangent_length = sqrt(d_squared - r**2)

# Angle from p2 to p1
alpha = atan2(dy, dx)

# Angle of tangent point (measured from p2)
# θ_T = α + π/2 - β where β = asin(r/d)
beta = asin(r / d)
theta_T = alpha + pi/2 - beta

# Angle of p3 (measured from p2)
dx3 = x3_t - x2_t
dy3 = y3_t - y2_t
theta_p3 = atan2(dy3, dx3)

# Arc angle (from tangent point to p3, going around drum)
arc_angle = theta_p3 - theta_T

# Arc length
arc_length = r * arc_angle

# CONSTRAINT FUNCTION
C = tangent_length + arc_length - L

print("\nConstraint function:")
print("C = tangent_length + arc_length - L")
print(f"C = {C}")

# ============================================================================
# PART 1: GRADIENTS (for computeEffectRopeDrum)
# ============================================================================

print("\n" + "=" * 80)
print("PART 1: GRADIENTS (∂C/∂xi, ∂C/∂yi)")
print("=" * 80)

gradients = {}
for var_name, var in [('x1', x1), ('y1', y1), ('x2', x2), ('y2', y2), ('x3', x3), ('y3', y3)]:
    print(f"\n∂C/∂{var_name}:")
    grad = diff(C, var).subs(t, 0)
    grad_simplified = simplify(grad)
    gradients[var_name] = grad_simplified
    print(f"  {grad_simplified}")

# ============================================================================
# PART 2: ACCELERATION (for computeAccelerationRopeDrum)
# ============================================================================

print("\n" + "=" * 80)
print("PART 2: ACCELERATION (d²C/dt²)")
print("=" * 80)

print("\nComputing second time derivative...")
dC_dt = diff(C, t)
d2C_dt2 = diff(dC_dt, t)

print("\nEvaluating at t=0...")
acceleration = d2C_dt2.subs(t, 0)

print("\nSimplifying...")
acceleration_simplified = simplify(acceleration)

print(f"\nd²C/dt² = {acceleration_simplified}")

# ============================================================================
# PART 3: FACTORIZATION AND COMMON SUBEXPRESSIONS
# ============================================================================

print("\n" + "=" * 80)
print("PART 3: COMMON SUBEXPRESSIONS FOR EFFICIENT IMPLEMENTATION")
print("=" * 80)

# Define common terms that will appear in implementation
print("\nCommon terms:")
print("  dx = x1 - x2")
print("  dy = y1 - y2")
print("  d² = dx² + dy²")
print("  d = sqrt(d²)")
print("  tangent_length = sqrt(d² - r²)")
print("  dx3 = x3 - x2")
print("  dy3 = y3 - y2")

print("\n" + "=" * 80)
print("SAVING RESULTS TO FILE")
print("=" * 80)

# Save all results to a file for implementation
with open('/home/user/jstreb/science/ropedrum_formulas.txt', 'w') as f:
    f.write("=" * 80 + "\n")
    f.write("RopeDrum Constraint - Implementation Formulas\n")
    f.write("=" * 80 + "\n\n")

    f.write("GRADIENTS (for computeEffectRopeDrum):\n")
    f.write("-" * 80 + "\n")
    for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
        f.write(f"∂C/∂{var_name} = {gradients[var_name]}\n\n")

    f.write("\n" + "=" * 80 + "\n")
    f.write("ACCELERATION (for computeAccelerationRopeDrum):\n")
    f.write("-" * 80 + "\n")
    f.write(f"d²C/dt² = {acceleration_simplified}\n\n")

print("\nResults saved to: science/ropedrum_formulas.txt")

# ============================================================================
# PART 4: NUMERICAL VERIFICATION
# ============================================================================

print("\n" + "=" * 80)
print("PART 4: NUMERICAL VERIFICATION")
print("=" * 80)

# Use the values from the Drum Counterweight preset
values = {
    x1: 436, y1: 622,    # p1 - counterweight
    x2: 536, y2: 472.7,  # p2 - drum center
    x3: 578, y3: 515,    # p3 - drum attachment
    r: 60,
    L: 13,
    # Zero initial velocities for checking gradients
    vx1: 0, vy1: 0,
    vx2: 0, vy2: 0,
    vx3: 0, vy3: 0
}

print("\nUsing Drum Counterweight preset initial positions:")
print(f"  p1 = ({values[x1]}, {values[y1]})")
print(f"  p2 = ({values[x2]}, {values[y2]})")
print(f"  p3 = ({values[x3]}, {values[y3]})")
print(f"  r = {values[r]}, L = {values[L]}")

# Evaluate constraint at initial position
C_initial = C.subs(t, 0).subs(values)
print(f"\nConstraint value at t=0: C = {float(C_initial):.6f}")
print("  (Should be close to 0 if totalLength is correct)")

# Evaluate gradients
print("\nGradient values:")
for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
    grad_value = gradients[var_name].subs(values)
    print(f"  ∂C/∂{var_name} = {float(grad_value):.6f}")

print("\n" + "=" * 80)
print("DERIVATION COMPLETE")
print("=" * 80)
