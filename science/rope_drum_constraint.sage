#!/usr/bin/env sage
"""
Derive the exact constraint equations for the RopeDrum constraint.

The constraint models a rope wrapping tangentially around a circular drum.
- p1 (x1, y1): Free end of rope (counterweight)
- p2 (x2, y2): Center of drum
- p3 (x3, y3): Attachment point on drum circumference

Constraint: tangent_length + arc_length = total_length
where:
  tangent_length = sqrt((x1-x2)^2 + (y1-y2)^2 - r^2)
  arc_length = r * angle_from_tangent_to_p3
"""

# Define symbolic variables
var('x1 y1 x2 y2 x3 y3 r L t')  # positions, radius, total length, time
var('vx1 vy1 vx2 vy2 vx3 vy3')  # velocities

print("=== RopeDrum Constraint Derivation ===\n")

# Time-dependent positions
x1_t = x1 + t * vx1
y1_t = y1 + t * vy1
x2_t = x2 + t * vx2
y2_t = y2 + t * vy2
x3_t = x3 + t * vx3
y3_t = y3 + t * vy3

# Distance from p1 to p2
dx12 = x1_t - x2_t
dy12 = y1_t - y2_t
d_squared = dx12^2 + dy12^2
d = sqrt(d_squared)

# Tangent length (from p1 to drum surface)
tangent_length = sqrt(d_squared - r^2)

print("Tangent length:")
print(f"  L_tangent = sqrt(d^2 - r^2)")
print(f"  where d^2 = (x1-x2)^2 + (y1-y2)^2")
print()

# Angle from p2 to p1
# alpha = atan2(dy12, dx12)
# For symbolic work, we'll work with the components

# Angle to p3 from p2
# theta_p3 = atan2(y3-y2, x3-x2)

# For the arc angle computation, we need:
# arc_angle = theta_p3 - theta_tangent
# where theta_tangent depends on alpha and the tangent geometry

# Let's use a simpler formulation that avoids explicit angles
# The key insight: the constraint is holonomic if we track it correctly

# Simplified constraint (without explicit angle wrapping issues):
# We'll compute the constraint as:
# C = sqrt((x1-x2)^2 + (y1-y2)^2 - r^2) + r*theta - L

# For theta, use atan2 formulation but be careful
# Let's first derive for the tangent length part

print("Part 1: Tangent length derivatives")
print("="*50)

# Constraint for just the tangent part
C_tangent = tangent_length

# Compute gradients at t=0
dC_dx1 = derivative(C_tangent, x1_t).subs(t=0).simplify_full()
dC_dy1 = derivative(C_tangent, y1_t).subs(t=0).simplify_full()
dC_dx2 = derivative(C_tangent, x2_t).subs(t=0).simplify_full()
dC_dy2 = derivative(C_tangent, y2_t).subs(t=0).simplify_full()

print("\nGradient of tangent length:")
print(f"  ∂C_tangent/∂x1 = {dC_dx1}")
print(f"  ∂C_tangent/∂y1 = {dC_dy1}")
print(f"  ∂C_tangent/∂x2 = {dC_dx2}")
print(f"  ∂C_tangent/∂y2 = {dC_dy2}")
print()

# Second time derivative (for acceleration)
d2C_dt2_tangent = derivative(C_tangent, t, 2).subs(t=0).simplify_full()
print("Second time derivative of tangent length:")
print(f"  d²C_tangent/dt² = {d2C_dt2_tangent}")
print()

# Now for the angular part
print("\nPart 2: Angular arc length")
print("="*50)

# The arc length is r*theta where theta is the angle from tangent point to p3
# This is complex because it involves atan2

# Let's use a different approach: work with the wedge product
# The constraint can be expressed using the signed area

# Actually, let's compute it more carefully
# Define the angle to p3 from p2
dx23 = x3_t - x2_t
dy23 = y3_t - y2_t

# For small angles, atan2(y,x) ≈ y/x (but we need exact)
# Let's compute the derivative of atan2(dy23, dx23)

# Using the fact that d/dt[atan2(y,x)] = (x*dy/dt - y*dx/dt)/(x^2 + y^2)

# Angle of p3 from p2
theta3 = atan2(dy23, dx23)

# For the tangent point, we need:
# theta_T = atan2(dy12, dx12) + pi/2 - asin(r/d)

# This gets messy. Let's use a numerical check approach instead.
# Or use the fact that the change in wrapped angle equals the rotation of p3

print("Note: Angular derivatives are complex due to atan2.")
print("Will compute numerically for verification.")
print()

# For the full constraint, we need both parts
print("\nPart 3: Combined constraint")
print("="*50)
print("Full constraint: C = sqrt(d^2 - r^2) + r*theta_arc - L = 0")
print()
print("The gradient and acceleration terms need careful handling of angles.")
print("The tangent length derivatives above are exact.")
print()

# Export the tangent length formulas
print("\n" + "="*70)
print("EXACT FORMULAS FOR IMPLEMENTATION")
print("="*70)

# Simplify by substituting dx = x1-x2, dy = y1-y2
print("\nLet dx = x1-x2, dy = y1-y2, d = sqrt(dx^2 + dy^2)")
print("Let tangent_length = sqrt(d^2 - r^2)")
print()

print("Gradients of tangent_length:")
print("  ∂/∂x1 = dx / tangent_length")
print("  ∂/∂y1 = dy / tangent_length")
print("  ∂/∂x2 = -dx / tangent_length")
print("  ∂/∂y2 = -dy / tangent_length")
print()

print("For velocities vx = vx1-vx2, vy = vy1-vy2:")
print("  radial_velocity = (dx*vx + dy*vy) / d")
print()

# The second derivative
var('vx vy')
d_expr = sqrt(x1^2 + y1^2)  # Using x1,y1 as dx,dy for simplicity
tangent_expr = sqrt(x1^2 + y1^2 - r^2)

# Time derivative: d(tangent)/dt
d_dt_tangent = derivative(tangent_expr.subs(x1=x1+t*vx, y1=y1+t*vy), t).subs(t=0).simplify_full()
print(f"First time derivative: dL_tangent/dt = {d_dt_tangent}")

# Second time derivative
d2_dt2_tangent = derivative(tangent_expr.subs(x1=x1+t*vx, y1=y1+t*vy), t, 2).subs(t=0).simplify_full()
print(f"\nSecond time derivative: d²L_tangent/dt² = ")
print(d2_dt2_tangent.factor())
print()

print("\nSimplified form for d²L_tangent/dt²:")
print("  = (vx^2 + vy^2) * r^2 / (d^2 - r^2)^(3/2)")
print("  where d^2 = x1^2 + y1^2 (representing (dx)^2 + (dy)^2)")
