#!/usr/bin/env python3
"""
Derive the exact constraint equations for the RopeDrum constraint using SymPy.
"""

from sympy import *

print("=== RopeDrum Constraint Derivation ===\n")

# Use simplified variables
dx, dy, r = symbols('dx dy r', real=True, positive=True)
vx, vy = symbols('vx vy', real=True)
t = symbols('t', real=True)

print("Working with simplified coordinates:")
print("  dx = x1 - x2 (horizontal distance from p2 to p1)")
print("  dy = y1 - y2 (vertical distance from p2 to p1)")
print("  r = drum radius")
print("  vx = vx1 - vx2 (relative horizontal velocity)")
print("  vy = vy1 - vy2 (relative vertical velocity)")
print()

# Distance and tangent length
d = sqrt(dx**2 + dy**2)
tangent_length = sqrt(dx**2 + dy**2 - r**2)

print("Tangent length formula:")
print(f"  L_tangent = sqrt(dx² + dy² - r²)")
print()

# Time-dependent version
dx_t = dx + t * vx
dy_t = dy + t * vy
tangent_t = sqrt(dx_t**2 + dy_t**2 - r**2)

print("=" * 70)
print("PART 1: SPATIAL GRADIENTS")
print("=" * 70)

# Gradients with respect to dx, dy
grad_dx = diff(tangent_length, dx).simplify()
grad_dy = diff(tangent_length, dy).simplify()

print("\n∂L_tangent/∂dx =", grad_dx)
print("∂L_tangent/∂dy =", grad_dy)

print("\nIn code:")
print("  ∂L_tangent/∂x1 = dx / sqrt(dx² + dy² - r²)")
print("  ∂L_tangent/∂y1 = dy / sqrt(dx² + dy² - r²)")
print("  ∂L_tangent/∂x2 = -dx / sqrt(dx² + dy² - r²)")
print("  ∂L_tangent/∂y2 = -dy / sqrt(dx² + dy² - r²)")

print("\n" + "=" * 70)
print("PART 2: TIME DERIVATIVES (for acceleration)")
print("=" * 70)

# First time derivative
dL_dt = diff(tangent_t, t).subs(t, 0).simplify()
print("\nFirst time derivative at t=0:")
print("  dL_tangent/dt =", dL_dt)

# Second time derivative
d2L_dt2 = diff(tangent_t, t, 2).subs(t, 0).simplify()
print("\nSecond time derivative at t=0:")
print("  d²L_tangent/dt² =", d2L_dt2)

# Try to factor/simplify
d2L_factored = factor(d2L_dt2)
print("\nFactored form:")
print("  d²L_tangent/dt² =", d2L_factored)

# Express in terms of radial velocity
print("\nLet radial_vel = (dx*vx + dy*vy) / d where d = sqrt(dx² + dy²)")
print("Then we can rewrite the acceleration term.\n")

# Verify our formula
radial_vel = (dx*vx + dy*vy) / d
v_squared = vx**2 + vy**2

# The formula should be: (vx² + vy²) * r² / (dx² + dy² - r²)^(3/2)
expected_form = v_squared * r**2 / (dx**2 + dy**2 - r**2)**Rational(3, 2)

print("Expected acceleration formula:")
print("  (vx² + vy²) * r² / (dx² + dy² - r²)^(3/2)")
print()

# Check if they're equal
difference = simplify(d2L_dt2 - expected_form)
print(f"Difference from expected: {difference}")
if difference == 0:
    print("✓ Formula verified!")
else:
    print("Checking alternative form...")
    # Try with tangent_length substitution
    tangent_cubed = (dx**2 + dy**2 - r**2)**Rational(3, 2)
    alt_form = v_squared * r**2 / tangent_cubed
    diff2 = simplify(d2L_dt2 - alt_form)
    print(f"Alternative check: {diff2}")

print("\n" + "=" * 70)
print("EXACT IMPLEMENTATION FORMULAS")
print("=" * 70)

print("\nFor computeEffectRopeDrum (gradients):")
print("```javascript")
print("let dx = pos1.x - pos2.x;")
print("let dy = pos1.y - pos2.y;")
print("let tangent_length = Math.sqrt(dx*dx + dy*dy - r*r);")
print()
print("// Gradients")
print("let dC_dp1_x_tangent = dx / tangent_length;")
print("let dC_dp1_y_tangent = dy / tangent_length;")
print("let dC_dp2_x_tangent = -dx / tangent_length;")
print("let dC_dp2_y_tangent = -dy / tangent_length;")
print("```")

print("\nFor computeAccelerationRopeDrum:")
print("```javascript")
print("let dx = pos1.x - pos2.x;")
print("let dy = pos1.y - pos2.y;")
print("let vx = vel1.x - vel2.x;")
print("let vy = vel1.y - vel2.y;")
print()
print("let d_squared = dx*dx + dy*dy;")
print("let tangent_length_squared = d_squared - r*r;")
print("let tangent_length = Math.sqrt(tangent_length_squared);")
print()
print("// Acceleration from tangent length")
print("let v_squared = vx*vx + vy*vy;")
print("let accel_tangent = v_squared * r*r / (tangent_length * tangent_length * tangent_length);")
print("```")

print("\n" + "=" * 70)
print("ANGULAR PART (Arc Angle)")
print("=" * 70)

print("\nThe arc angle θ from tangent point to p3 requires:")
print()
print("1. Tangent point angle:")
print("   α = atan2(dy, dx)  // angle from p2 to p1")
print("   β = asin(r / d)    // offset to tangent")
print("   θ_T = α ± π/2 ∓ β  // tangent point angle")
print()
print("2. p3 angle:")
print("   θ_p3 = atan2(y3-y2, x3-x2)")
print()
print("3. Arc angle:")
print("   Δθ = θ_p3 - θ_T (with wrapping)")
print()
print("Derivatives of atan2(y, x):")
print("  ∂/∂x = -y / (x² + y²)")
print("  ∂/∂y = x / (x² + y²)")
print()
print("These need careful implementation to handle angle wrapping correctly.")
