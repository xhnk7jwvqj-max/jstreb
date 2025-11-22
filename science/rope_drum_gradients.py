#!/usr/bin/env python3
"""
Derive exact gradients for RopeDrum constraint including angular terms.
"""

from sympy import *

print("=== RopeDrum Gradient Derivation ===\n")

# Variables
dx, dy, r = symbols('dx dy r', real=True, positive=True)
dx3, dy3 = symbols('dx3 dy3', real=True)  # p3 - p2

print("Constraint: C = tangent_length + r*arc_angle - L")
print("  where tangent_length = sqrt(dx² + dy² - r²)")
print("  and arc_angle = θ_p3 - θ_T")
print()

# Tangent length part (already verified)
tangent_length = sqrt(dx**2 + dy**2 - r**2)

grad_tangent_dx = diff(tangent_length, dx)
grad_tangent_dy = diff(tangent_length, dy)

print("PART 1: Tangent Length Gradients")
print("="*70)
print(f"∂L_tangent/∂dx = {grad_tangent_dx}")
print(f"∂L_tangent/∂dy = {grad_tangent_dy}")
print()

# Angular part
print("PART 2: Angular Gradients")
print("="*70)
print("\nFor θ_p3 = atan2(dy3, dx3):")
print("  ∂θ_p3/∂x3 = ∂/∂x3[atan2(y3-y2, x3-x2)]")
print("           = ∂/∂dx3[atan2(dy3, dx3)]")
print("           = -dy3 / (dx3² + dy3²)")
print("           = -dy3 / r²  (since |p3-p2| = r)")
print()
print("  ∂θ_p3/∂y3 = dx3 / (dx3² + dy3²)")
print("           = dx3 / r²")
print()

# For θ_T = α + π/2 - β where α = atan2(dy, dx) and β = asin(r/d)
print("For θ_T = α + π/2 - β:")
print("  where α = atan2(dy, dx) and β = asin(r/d)")
print()

# α gradients
print("∂α/∂dx = ∂/∂dx[atan2(dy, dx)] = -dy / (dx² + dy²)")
print("∂α/∂dy = ∂/∂dy[atan2(dy, dx)] = dx / (dx² + dy²)")
print()

# β gradients
d = sqrt(dx**2 + dy**2)
beta_expr = asin(r / d)

grad_beta_dx = diff(beta_expr, dx).simplify()
grad_beta_dy = diff(beta_expr, dy).simplify()

print("∂β/∂dx = ∂/∂dx[asin(r/d)] =", grad_beta_dx)
print("∂β/∂dy = ∂/∂dy[asin(r/d)] =", grad_beta_dy)
print()

# Simplify
print("Simplified:")
print(f"  ∂β/∂dx = -r*dx / (d² * sqrt(d² - r²))")
print(f"  ∂β/∂dy = -r*dy / (d² * sqrt(d² - r²))")
print()

# Arc angle gradients
print("For arc_angle = θ_p3 - θ_T = θ_p3 - (α + π/2 - β):")
print()
print("∂(arc_angle)/∂x1 = -∂α/∂dx + ∂β/∂dx")
print("                 = dy/(dx²+dy²) - r*dx/(d²*tangent_length)")
print()
print("∂(arc_angle)/∂y1 = -∂α/∂dy + ∂β/∂dy")
print("                 = -dx/(dx²+dy²) - r*dy/(d²*tangent_length)")
print()
print("∂(arc_angle)/∂x2 = -∂(arc_angle)/∂x1 - ∂θ_p3/∂x2")
print("                 = -dy/(dx²+dy²) + r*dx/(d²*tangent_length) + 0")
print()
print("∂(arc_angle)/∂y2 = -∂(arc_angle)/∂y1 - ∂θ_p3/∂y2")
print("                 = dx/(dx²+dy²) + r*dy/(d²*tangent_length) + 0")
print()
print("∂(arc_angle)/∂x3 = ∂θ_p3/∂x3 = -dy3/r²")
print("∂(arc_angle)/∂y3 = ∂θ_p3/∂y3 = dx3/r²")
print()

print("="*70)
print("FULL CONSTRAINT GRADIENTS")
print("="*70)
print()
print("C = tangent_length + r*arc_angle - L")
print()
print("∂C/∂x1 = dx/tangent_length + r*[dy/d² - r*dx/(d²*tangent_length)]")
print("∂C/∂y1 = dy/tangent_length + r*[-dx/d² - r*dy/(d²*tangent_length)]")
print()
print("∂C/∂x2 = -dx/tangent_length + r*[-dy/d² + r*dx/(d²*tangent_length)]")
print("∂C/∂y2 = -dy/tangent_length + r*[dx/d² + r*dy/(d²*tangent_length)]")
print()
print("∂C/∂x3 = r*(-dy3/r²) = -dy3/r")
print("∂C/∂y3 = r*(dx3/r²) = dx3/r")
print()

print("="*70)
print("IMPLEMENTATION")
print("="*70)
print()
print("```javascript")
print("let dx = pos1[0] - pos2[0];")
print("let dy = pos1[1] - pos2[1];")
print("let dx3 = pos3[0] - pos2[0];")
print("let dy3 = pos3[1] - pos2[1];")
print()
print("let d2 = dx*dx + dy*dy;")
print("let tangent_length = Math.sqrt(d2 - r*r);")
print()
print("// Tangent part")
print("let grad_tangent_x = dx / tangent_length;")
print("let grad_tangent_y = dy / tangent_length;")
print()
print("// Angular part")
print("let grad_angle_x1 = dy/d2 - r*dx/(d2*tangent_length);")
print("let grad_angle_y1 = -dx/d2 - r*dy/(d2*tangent_length);")
print()
print("// Combined")
print("let dC_dx1 = grad_tangent_x + r*grad_angle_x1;")
print("let dC_dy1 = grad_tangent_y + r*grad_angle_y1;")
print("let dC_dx2 = -grad_tangent_x - r*grad_angle_x1;")
print("let dC_dy2 = -grad_tangent_y - r*grad_angle_y1;")
print("let dC_dx3 = -dy3/r;")
print("let dC_dy3 = dx3/r;")
print("```")
