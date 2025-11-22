#!/usr/bin/env python3
"""
Manual step-by-step derivation of RopeDrum constraint gradients
Using geometric formulas and chain rule

Constraint: C = tangent_length + arc_length - L = 0

Where:
  tangent_length = sqrt(d² - r²)
  arc_length = r * (θ_p3 - θ_T)

  d² = (x1-x2)² + (y1-y2)²
  θ_T = atan2(y1-y2, x1-x2) + π/2 - asin(r/d)  # tangent point angle
  θ_p3 = atan2(y3-y2, x3-x2)  # attachment point angle
"""

from sympy import *

# Positions
x1, y1, x2, y2, x3, y3 = symbols('x1 y1 x2 y2 x3 y3', real=True)
# Velocities
vx1, vy1, vx2, vy2, vx3, vy3 = symbols('vx1 vy1 vx2 vy2 vx3 vy3', real=True)
# Parameters
r, L = symbols('r L', positive=True, real=True)

print("=" * 80)
print("RopeDrum Constraint - Step-by-Step Gradient Derivation")
print("=" * 80)

# Define intermediate variables
dx = x1 - x2
dy = y1 - y2
dx3 = x3 - x2
dy3 = y3 - y2

d2 = dx**2 + dy**2
d = sqrt(d2)
tangent_length = sqrt(d2 - r**2)

print("\n--- PART 1: Tangent Length Gradients ---")
print("tangent_length = sqrt((x1-x2)² + (y1-y2)² - r²)")
print()

# ∂(tangent_length)/∂x1
dL_tangent_dx1 = diff(tangent_length, x1)
print(f"∂(tangent_length)/∂x1 = {simplify(dL_tangent_dx1)}")

# ∂(tangent_length)/∂y1
dL_tangent_dy1 = diff(tangent_length, y1)
print(f"∂(tangent_length)/∂y1 = {simplify(dL_tangent_dy1)}")

# ∂(tangent_length)/∂x2
dL_tangent_dx2 = diff(tangent_length, x2)
print(f"∂(tangent_length)/∂x2 = {simplify(dL_tangent_dx2)}")

# ∂(tangent_length)/∂y2
dL_tangent_dy2 = diff(tangent_length, y2)
print(f"∂(tangent_length)/∂y2 = {simplify(dL_tangent_dy2)}")

# ∂(tangent_length)/∂x3 = 0 (tangent length doesn't depend on p3)
print(f"∂(tangent_length)/∂x3 = 0")
print(f"∂(tangent_length)/∂y3 = 0")

print("\n--- PART 2: Arc Length Gradients (using geometric formulas) ---")
print("arc_length = r * (θ_p3 - θ_T)")
print()

# For θ_p3 = atan2(dy3, dx3):
# ∂θ_p3/∂x3 = -dy3/(dx3² + dy3²) = -dy3/r²
# ∂θ_p3/∂y3 = dx3/(dx3² + dy3²) = dx3/r²
# (Note: p3 is on the circle, so dx3² + dy3² = r²)

print("Since p3 is on circle: (x3-x2)² + (y3-y2)² = r²")
print()
print("θ_p3 = atan2(y3-y2, x3-x2)")
print("  ∂θ_p3/∂x3 = -(y3-y2)/r²")
print("  ∂θ_p3/∂y3 = (x3-x2)/r²")
print("  ∂θ_p3/∂x2 = (y3-y2)/r²")
print("  ∂θ_p3/∂y2 = -(x3-x2)/r²")
print()

# For θ_T = α + π/2 - β where:
#   α = atan2(dy, dx)
#   β = asin(r/d)
# We need ∂θ_T/∂xi

# ∂α/∂x1 = -dy/d²
# ∂α/∂y1 = dx/d²
# ∂α/∂x2 = dy/d²
# ∂α/∂y2 = -dx/d²

print("θ_T = α + π/2 - β where:")
print("  α = atan2(y1-y2, x1-x2)")
print("  β = asin(r/d)")
print()
print("∂α/∂x1 = -(y1-y2)/d²")
print("∂α/∂y1 = (x1-x2)/d²")
print()

# For β = asin(r/d):
# ∂β/∂xi = (∂/∂xi) asin(r/d)
#        = 1/sqrt(1-(r/d)²) * r * (-1/d²) * ∂d/∂xi
#        = r/(d*sqrt(d²-r²)) * (-1/d) * ∂d/∂xi
#        = -r/(d²*tangent_length) * ∂d/∂xi

# ∂d/∂x1 = (x1-x2)/d = dx/d
# ∂d/∂y1 = (y1-y2)/d = dy/d

print("∂β/∂x1 = -r/(d² * tangent_length) * (x1-x2)/d")
print("       = -r*(x1-x2)/(d³ * tangent_length)")
print("∂β/∂y1 = -r*(y1-y2)/(d³ * tangent_length)")
print()

print("Therefore:")
print("∂θ_T/∂x1 = ∂α/∂x1 - ∂β/∂x1")
print("         = -(y1-y2)/d² + r*(x1-x2)/(d³ * tangent_length)")
print()
print("∂θ_T/∂y1 = ∂α/∂y1 - ∂β/∂y1")
print("         = (x1-x2)/d² + r*(y1-y2)/(d³ * tangent_length)")
print()

print("--- PART 3: Complete Constraint Gradients ---")
print("C = tangent_length + arc_length - L")
print("  = tangent_length + r*(θ_p3 - θ_T) - L")
print()

print("∂C/∂x1 = ∂(tangent_length)/∂x1 + r*(-∂θ_T/∂x1)")
print("       = (x1-x2)/tangent_length - r*[-(y1-y2)/d² + r*(x1-x2)/(d³*tangent_length)]")
print("       = (x1-x2)/tangent_length + r*(y1-y2)/d² - r²*(x1-x2)/(d³*tangent_length)")
print()

print("∂C/∂y1 = ∂(tangent_length)/∂y1 + r*(-∂θ_T/∂y1)")
print("       = (y1-y2)/tangent_length - r*[(x1-x2)/d² + r*(y1-y2)/(d³*tangent_length)]")
print("       = (y1-y2)/tangent_length - r*(x1-x2)/d² - r²*(y1-y2)/(d³*tangent_length)")
print()

print("∂C/∂x3 = r*∂θ_p3/∂x3 = -r*(y3-y2)/r² = -(y3-y2)/r")
print("∂C/∂y3 = r*∂θ_p3/∂y3 = r*(x3-x2)/r² = (x3-x2)/r")
print()

print("∂C/∂x2 = ∂(tangent_length)/∂x2 + r*(∂θ_p3/∂x2 - ∂θ_T/∂x2)")
print("       = -(x1-x2)/tangent_length + r*[(y3-y2)/r² - (-(y1-y2)/d² + r*(x1-x2)/(d³*tangent_length))]")
print("       = -(x1-x2)/tangent_length + (y3-y2)/r + r*(y1-y2)/d² - r²*(x1-x2)/(d³*tangent_length)")
print()

print("∂C/∂y2 = ∂(tangent_length)/∂y2 + r*(∂θ_p3/∂y2 - ∂θ_T/∂y2)")
print("       = -(y1-y2)/tangent_length + r*[-(x3-x2)/r² - ((x1-x2)/d² + r*(y1-y2)/(d³*tangent_length))]")
print("       = -(y1-y2)/tangent_length - (x3-x2)/r - r*(x1-x2)/d² - r²*(y1-y2)/(d³*tangent_length)")
print()

print("=" * 80)
print("FORMULAS READY FOR IMPLEMENTATION")
print("=" * 80)

# Save for implementation
with open('/home/user/jstreb/science/ropedrum_gradient_formulas.txt', 'w') as f:
    f.write("RopeDrum Constraint Gradients (for computeEffectRopeDrum)\n")
    f.write("=" * 80 + "\n\n")

    f.write("Common terms:\n")
    f.write("  dx = x1 - x2\n")
    f.write("  dy = y1 - y2\n")
    f.write("  dx3 = x3 - x2\n")
    f.write("  dy3 = y3 - y2\n")
    f.write("  d² = dx² + dy²\n")
    f.write("  d = sqrt(d²)\n")
    f.write("  d³ = d² * d\n")
    f.write("  tangent_length = sqrt(d² - r²)\n")
    f.write("  tl_r = tangent_length * r\n")
    f.write("\n")

    f.write("Gradients:\n")
    f.write("-" * 80 + "\n")
    f.write("∂C/∂x1 = dx/tangent_length + r*dy/d² - r²*dx/(d³*tangent_length)\n")
    f.write("       = dx/tangent_length + r*dy/d² - r²*dx/(d²*d*tangent_length)\n")
    f.write("\n")
    f.write("∂C/∂y1 = dy/tangent_length - r*dx/d² - r²*dy/(d³*tangent_length)\n")
    f.write("       = dy/tangent_length - r*dx/d² - r²*dy/(d²*d*tangent_length)\n")
    f.write("\n")
    f.write("∂C/∂x2 = -dx/tangent_length + dy3/r + r*dy/d² - r²*dx/(d³*tangent_length)\n")
    f.write("\n")
    f.write("∂C/∂y2 = -dy/tangent_length - dx3/r - r*dx/d² - r²*dy/(d³*tangent_length)\n")
    f.write("\n")
    f.write("∂C/∂x3 = -dy3/r\n")
    f.write("\n")
    f.write("∂C/∂y3 = dx3/r\n")
    f.write("\n")

print("Formulas saved to: science/ropedrum_gradient_formulas.txt")
