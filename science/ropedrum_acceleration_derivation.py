#!/usr/bin/env python3
"""
Derivation of d²C/dt² for RopeDrum constraint

Following the pattern from Roller Constraint Math.ipynb:
We compute the second time derivative treating positions as x(t) = x + t*v
where the velocity v is constant (not accelerating).

This gives us the "velocity-dependent" terms for the acceleration constraint.
"""

from sympy import *

# Positions at time 0
x1, y1, x2, y2, x3, y3 = symbols('x1 y1 x2 y2 x3 y3', real=True)
# Velocities (treated as constants)
vx1, vy1, vx2, vy2, vx3, vy3 = symbols('vx1 vy1 vx2 vy2 vx3 vy3', real=True)
# Parameters
r, L = symbols('r L', positive=True, real=True)
# Time
t = symbols('t', real=True)

print("=" * 80)
print("RopeDrum Constraint - Acceleration Term d²C/dt²")
print("=" * 80)

# Time-parameterized positions (linear motion, no acceleration)
x1_t = x1 + t * vx1
y1_t = y1 + t * vy1
x2_t = x2 + t * vx2
y2_t = y2 + t * vy2
x3_t = x3 + t * vx3
y3_t = y3 + t * vy3

print("\nWe'll split this into two parts:")
print("  Part 1: Tangent length acceleration")
print("  Part 2: Arc angle acceleration")
print()

# === PART 1: Tangent Length ===
print("=" * 80)
print("PART 1: Tangent Length Second Derivative")
print("=" * 80)

dx_t = x1_t - x2_t
dy_t = y1_t - y2_t
d2_t = dx_t**2 + dy_t**2

tangent_length_t = sqrt(d2_t - r**2)

print(f"\ntangent_length(t) = sqrt((x1-x2+t*(vx1-vx2))² + (y1-y2+t*(vy1-vy2))² - r²)")

# First derivative
dL_dt = diff(tangent_length_t, t)
print(f"\nd(tangent_length)/dt = {dL_dt}")

# Second derivative
d2L_dt2 = diff(dL_dt, t)
print(f"\nd²(tangent_length)/dt² before substitution = {d2L_dt2}")

# Evaluate at t=0
d2L_dt2_at_0 = d2L_dt2.subs(t, 0)
print(f"\nd²(tangent_length)/dt² at t=0:")

# Simplify
d2L_dt2_simplified = simplify(d2L_dt2_at_0)
print(f"  {d2L_dt2_simplified}")

# Try to factor
d2L_dt2_factored = factor(d2L_dt2_simplified)
print(f"\nFactored:")
print(f"  {d2L_dt2_factored}")

# === PART 2: Arc Angle ===
print("\n" + "=" * 80)
print("PART 2: Arc Angle Second Derivative")
print("=" * 80)

# For the arc angle, we use: arc_angle = θ_p3 - θ_T

# θ_p3 = atan2(y3-y2, x3-x2)
# Since p3 is constrained to lie on the circle, (x3-x2)² + (y3-y2)² = r²
# This is a constraint on p3's motion that we need to account for

dx3_t = x3_t - x2_t
dy3_t = y3_t - y2_t

# For a point constrained to a circle of radius r:
# θ = atan2(y, x)
# dθ/dt = (x*dy/dt - y*dx/dt) / (x² + y²) = (x*vy - y*vx) / r²
# d²θ/dt² = derivative of above

# For θ_p3:
vx3_rel = vx3 - vx2
vy3_rel = vy3 - vy2

# Use the formula: dθ/dt = (x*vy - y*vx)/r² for a point on circle
# Then d²θ/dt² comes from differentiating this

# Actually, let's use SymPy's atan2 function directly
theta_p3_t = atan2(dy3_t, dx3_t)

print(f"\nθ_p3(t) = atan2(y3-y2+t*(vy3-vy2), x3-x2+t*(vx3-vx2))")

dtheta_p3_dt = diff(theta_p3_t, t)
print(f"\ndθ_p3/dt = {dtheta_p3_dt}")

d2theta_p3_dt2 = diff(dtheta_p3_dt, t)
d2theta_p3_dt2_at_0 = simplify(d2theta_p3_dt2.subs(t, 0))
print(f"\nd²θ_p3/dt² at t=0 = {d2theta_p3_dt2_at_0}")

# For θ_T = α + π/2 - β where:
#   α = atan2(dy, dx)
#   β = asin(r/d)

print(f"\nFor θ_T = α + π/2 - β:")

# α part
alpha_t = atan2(dy_t, dx_t)
dalpha_dt = diff(alpha_t, t)
d2alpha_dt2 = diff(dalpha_dt, t)
d2alpha_dt2_at_0 = simplify(d2alpha_dt2.subs(t, 0))
print(f"  d²α/dt² at t=0 = {d2alpha_dt2_at_0}")

# β part
d_t = sqrt(d2_t)
beta_t = asin(r / d_t)
dbeta_dt = diff(beta_t, t)
d2beta_dt2 = diff(dbeta_dt, t)

print(f"\nComputing d²β/dt²...")
d2beta_dt2_at_0 = d2beta_dt2.subs(t, 0)
d2beta_dt2_simplified = simplify(d2beta_dt2_at_0)
print(f"  d²β/dt² at t=0 = {d2beta_dt2_simplified}")

# Total θ_T acceleration
d2theta_T_dt2 = d2alpha_dt2_at_0 - d2beta_dt2_simplified
print(f"\nd²θ_T/dt² = d²α/dt² - d²β/dt²")
print(f"           = {simplify(d2theta_T_dt2)}")

# Arc angle acceleration
d2_arc_angle_dt2 = d2theta_p3_dt2_at_0 - d2theta_T_dt2
print(f"\nd²(arc_angle)/dt² = d²θ_p3/dt² - d²θ_T/dt²")
print(f"                  = {simplify(d2_arc_angle_dt2)}")

# Arc length acceleration
d2_arc_length_dt2 = r * d2_arc_angle_dt2
print(f"\nd²(arc_length)/dt² = r * d²(arc_angle)/dt²")
print(f"                   = {simplify(d2_arc_length_dt2)}")

# === TOTAL ACCELERATION ===
print("\n" + "=" * 80)
print("TOTAL CONSTRAINT ACCELERATION")
print("=" * 80)

total_accel = d2L_dt2_simplified + d2_arc_length_dt2
total_accel_simplified = simplify(total_accel)

print(f"\nd²C/dt² = d²(tangent_length)/dt² + d²(arc_length)/dt²")
print(f"\n  = {d2L_dt2_simplified}")
print(f"\n  + {simplify(d2_arc_length_dt2)}")
print(f"\n  = {total_accel_simplified}")

print("\n" + "=" * 80)
print("Attempting to factor...")
print("=" * 80)

total_accel_factored = factor(total_accel_simplified)
print(f"\nFactored form:")
print(f"  {total_accel_factored}")

# Save results
with open('/home/user/jstreb/science/ropedrum_acceleration_formula.txt', 'w') as f:
    f.write("RopeDrum Constraint Acceleration (for computeAccelerationRopeDrum)\n")
    f.write("=" * 80 + "\n\n")

    f.write("Part 1: Tangent Length Acceleration\n")
    f.write("-" * 80 + "\n")
    f.write(f"d²(tangent_length)/dt² = {d2L_dt2_simplified}\n\n")

    f.write("Part 2: Arc Length Acceleration\n")
    f.write("-" * 80 + "\n")
    f.write(f"d²(arc_length)/dt² = {simplify(d2_arc_length_dt2)}\n\n")

    f.write("Total Acceleration\n")
    f.write("-" * 80 + "\n")
    f.write(f"d²C/dt² = {total_accel_simplified}\n\n")

print("\nResults saved to: science/ropedrum_acceleration_formula.txt")
print("\nThis may take some time to simplify...")
