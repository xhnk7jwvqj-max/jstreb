#!/usr/bin/env python3
"""
Correct derivation of RopeDrumY constraint with proper arc angle handling.
"""

import sympy as sp
from sympy.printing import jscode

# Positions stored as [y, x] for RopeDrumY
y1, x1 = sp.symbols('y1 x1', real=True)  # free end
y2, x2 = sp.symbols('y2 x2', real=True)  # drum center
y3, x3 = sp.symbols('y3 x3', real=True)  # point on drum circumference

r = sp.Symbol('r', positive=True, real=True)
L = sp.Symbol('L', positive=True, real=True)

# Distance from p1 to drum center
dx = x1 - x2
dy = y1 - y2
d_sq = dx**2 + dy**2
d = sp.sqrt(d_sq)

# Tangent length
tangent_length = sp.sqrt(d_sq - r**2)

# Angle to p3 from drum center
alpha = sp.atan2(y3 - y2, x3 - x2)

# Angle to tangent point
beta = sp.asin(r / d)
theta_tangent = sp.atan2(dy, dx) + sp.pi/2 - beta

# Arc angle from tangent point to p3 (going around drum)
# We need the signed angle difference
arc_angle_raw = alpha - theta_tangent

# Normalize to appropriate range (handling wrapping)
# For now, use the raw expression - SymPy will handle it symbolically

# For the actual implementation, we use:
# tangent_length + r * |arc_angle| = L
# But symbolically, let's compute both pieces

C = tangent_length + r * arc_angle_raw - L

print("Full constraint C =", C)
print("\n" + "=" * 60)

# Compute gradients
print("PARTICLE 1 GRADIENTS:")
dC_dy1 = sp.diff(C, y1).simplify()
dC_dx1 = sp.diff(C, x1).simplify()
print("∂C/∂y1:", dC_dy1)
print("∂C/∂x1:", dC_dx1)

print("\nPARTICLE 2 GRADIENTS:")
dC_dy2 = sp.diff(C, y2).simplify()
dC_dx2 = sp.diff(C, x2).simplify()
print("∂C/∂y2:", dC_dy2)
print("∂C/∂x2:", dC_dx2)

print("\nPARTICLE 3 GRADIENTS:")
dC_dy3 = sp.diff(C, y3).simplify()
dC_dx3 = sp.diff(C, x3).simplify()
print("∂C/∂y3:", dC_dy3)
print("∂C/∂x3:", dC_dx3)

print("\n" + "=" * 60)
print("Let me try a different approach - match RopeDrum structure")
print("=" * 60)

# Looking at the original RopeDrum code, it seems to use:
# For p3 gradients: involves alpha directly
# Let me compute d(alpha)/dy3 and d(alpha)/dx3

dalpha_dy3 = sp.diff(alpha, y3)
dalpha_dx3 = sp.diff(alpha, x3)

print("\n∂α/∂y3:", dalpha_dy3.simplify())
print("∂α/∂x3:", dalpha_dx3.simplify())

#Since arc_length = r * arc_angle, and arc_angle involves alpha:
# ∂C/∂y3 = r * ∂arc_angle/∂y3 = r * ∂alpha/∂y3
# ∂C/∂x3 = r * ∂arc_angle/∂x3 = r * ∂alpha/∂x3

print("\nFor RopeDrumY, p3 gradients should be:")
print("∂C/∂y3 = r * ∂α/∂y3 = r *", dalpha_dy3.simplify())
print("∂C/∂x3 = r * ∂α/∂x3 = r *", dalpha_dx3.simplify())

# Compute the actual values
d3_sq = (x3 - x2)**2 + (y3 - y2)**2
print("\nSimplified:")
print("∂C/∂y3 = r * (x3-x2) / [(x3-x2)² + (y3-y2)²]")
print("∂C/∂x3 = -r * (y3-y2) / [(x3-x2)² + (y3-y2)²]")

print("\nJavaScript:")
print("let d3_sq = (x3-x2)*(x3-x2) + (y3-y2)*(y3-y2);")
print("let dC_dy3 = r * (x3 - x2) / d3_sq;")
print("let dC_dx3 = -r * (y3 - y2) / d3_sq;")
