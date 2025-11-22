#!/usr/bin/env python3
"""
Complete derivation of RopeDrum constraint with both tangent and angular parts.
"""

from sympy import *

print("=== Complete RopeDrum Constraint Derivation ===\n")

# Variables
dx, dy, r = symbols('dx dy r', real=True, positive=True)
dx3, dy3 = symbols('dx3 dy3', real=True)  # p3 - p2
vx, vy = symbols('vx vy', real=True)
vx3, vy3 = symbols('vx3 vy3', real=True)  # velocity of p3 relative to p2
t = symbols('t', real=True)

print("="*70)
print("PART 1: TANGENT LENGTH (verified)")
print("="*70)

# Tangent length
tangent_length = sqrt(dx**2 + dy**2 - r**2)
dx_t = dx + t*vx
dy_t = dy + t*vy
tangent_t = sqrt(dx_t**2 + dy_t**2 - r**2)

# Second derivative
d2tangent_dt2 = diff(tangent_t, t, 2).subs(t, 0).simplify()

print("\nExact second time derivative:")
print(f"  d²L_tangent/dt² = {d2tangent_dt2}")

# Expand the numerator
numer = ((vx**2 + vy**2)*(dx**2 + dy**2 - r**2) - (dx*vx + dy*vy)**2).expand()
print("\nNumerator expanded:")
print(f"  {numer}")

# Try to recognize it as (dy*vx - dx*vy)^2 - r^2*(vx^2 + vy^2)
wedge_squared = (dy*vx - dx*vy)**2
simplified_numer = (wedge_squared - r**2*(vx**2 + vy**2)).expand()

print("\nRewritten as wedge product:")
print(f"  (dy*vx - dx*vy)² - r²*(vx² + vy²) = {simplified_numer}")

print(f"\nDifference: {simplify(numer - simplified_numer)}")

print("\nFINAL TANGENT FORMULA:")
print("  d²L_tangent/dt² = [(dy*vx - dx*vy)² - r²*(vx² + vy²)] / tangent_length³")

print("\n" + "="*70)
print("PART 2: ANGULAR COMPONENT")
print("="*70)

print("\nFor angle θ_p3 = atan2(dy3, dx3):")
print("Time derivative formulas:")

# For atan2(y, x), the derivative is:
# d/dt[atan2(y,x)] = (x * dy/dt - y * dx/dt) / (x² + y²)

print("\n  dθ_p3/dt = (dx3*vy3 - dy3*vx3) / (dx3² + dy3²)")
print("           = (dx3*vy3 - dy3*vx3) / r²  (since |p3-p2| = r)")

# Second derivative of angle
# d²θ/dt² = d/dt[(dx3*vy3 - dy3*vx3) / r²]

print("\nFor the tangent point angle θ_T = α + π/2 - β:")
print("  where α = atan2(dy, dx) and β = asin(r/d)")

print("\n  dα/dt = (dx*vy - dy*vx) / (dx² + dy²)")
print("        = (dx*vy - dy*vx) / d²")

print("\n  dβ/dt = d/dt[asin(r/d)]")
print("        = (1/sqrt(1 - r²/d²)) * (-r/d²) * dd/dt")
print("        = (-r / sqrt(d² - r²)) * (1/d²) * (dx*vx + dy*vy)")
print("        = -r*(dx*vx + dy*vy) / (d² * tangent_length)")

print("\nArc angle: Δθ = θ_p3 - θ_T")
print("  dΔθ/dt = dθ_p3/dt - dα/dt - dβ/dt")

print("\nArc length: L_arc = r * Δθ")
print("  dL_arc/dt = r * dΔθ/dt")
print("  d²L_arc/dt² = r * d²Δθ/dt²")

print("\n" + "="*70)
print("IMPLEMENTATION STRATEGY")
print("="*70)

print("\nThe full constraint: C = L_tangent + r*Δθ - L_total = 0")
print("\nFor computeEffectRopeDrum (∇C):")
print("  Combine:")
print("    - Tangent gradients (exact, already computed)")
print("    - Angular gradients (from atan2 derivatives)")

print("\nFor computeAccelerationRopeDrum (d²C/dt²):")
print("  = d²L_tangent/dt² + r * d²Δθ/dt²")

print("\n" + "="*70)
print("CORRECTED IMPLEMENTATION")
print("="*70)

print("\n1. Tangent length acceleration (CORRECTED):")
print("```javascript")
print("let wedge = dy*vx - dx*vy;  // Cross product")
print("let v_squared = vx*vx + vy*vy;")
print("let accel_tangent = (wedge*wedge - r*r*v_squared) / (tangent_length * tangent_length * tangent_length);")
print("```")

print("\n2. Angular acceleration:")
print("```javascript")
print("// Angular velocity of p3 around p2")
print("let omega_p3 = (dx3*vy3 - dy3*vx3) / (r*r);")
print()
print("// Angular velocity of tangent point")
print("let d_squared = dx*dx + dy*dy;")
print("let d = Math.sqrt(d_squared);")
print("let omega_alpha = (dx*vy - dy*vx) / d_squared;")
print()
print("// Rate of change of β = asin(r/d)")
print("let radial_vel = dx*vx + dy*vy;")
print("let d_beta_dt = -r * radial_vel / (d_squared * tangent_length);")
print()
print("// Net angular rate")
print("let omega_arc = omega_p3 - omega_alpha + d_beta_dt;")
print()
print("// For second derivative, need d(omega)/dt")
print("// This is complex; may need numerical differentiation or full symbolic expansion")
print("```")
