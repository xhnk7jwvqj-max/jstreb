#!/usr/bin/env python3
"""
Derive RopeDrumY constraint gradients and acceleration using SymPy.

RopeDrumY is the Y-axis variant where particle positions are stored as [y, x] instead of [x, y].
This means pos[0] = y-coordinate and pos[1] = x-coordinate.

The constraint is the same rope-around-drum constraint, but with swapped coordinate interpretation.
"""

import sympy as sp
from sympy.printing import jscode

# Define symbols for positions (stored as [y, x])
# Particle 1: free end of rope
y1, x1 = sp.symbols('y1 x1', real=True)
# Particle 2: drum center
y2, x2 = sp.symbols('y2 x2', real=True)
# Particle 3: point on drum circumference
y3, x3 = sp.symbols('y3 x3', real=True)

# Drum radius
r = sp.Symbol('r', positive=True, real=True)

# Total rope length (constant)
L = sp.Symbol('L', positive=True, real=True)

# Distance from free end to drum center
dx = x1 - x2
dy = y1 - y2
d_sq = dx**2 + dy**2
d = sp.sqrt(d_sq)

# Tangent length (straight part of rope)
tangent_length = sp.sqrt(d_sq - r**2)

# Angle from drum center to p3
alpha = sp.atan2(y3 - y2, x3 - x2)

# Angle to tangent point
# Using geometry: tangent touches drum at angle offset from line to p1
beta = sp.asin(r / d)
theta_T = alpha + sp.pi/2 - beta

# Arc angle (from tangent point to p3, going around drum)
arc_angle = theta_T - alpha
# Simplify: arc_angle = pi/2 - beta = pi/2 - asin(r/d)

# Arc length
arc_length = r * arc_angle

# Constraint: tangent_length + arc_length = L
C = tangent_length + arc_length - L

print("=" * 60)
print("RopeDrumY Constraint (y stored in pos[0], x stored in pos[1])")
print("=" * 60)
print("\nConstraint C =", C)

# Simplify arc angle
arc_simplified = sp.pi/2 - sp.asin(r/d)
C_simplified = tangent_length + r * arc_simplified - L
print("\nSimplified C =", C_simplified)

# Compute gradients with respect to each coordinate
# These are derivatives with respect to the STORED coordinates
# result[0] = ∂C/∂(pos[0]) = ∂C/∂y
# result[1] = ∂C/∂(pos[1]) = ∂C/∂x

print("\n" + "=" * 60)
print("GRADIENTS")
print("=" * 60)

# Particle 1 gradients
dC_dy1 = sp.diff(C, y1)
dC_dx1 = sp.diff(C, x1)
print("\n∂C/∂y1 =", dC_dy1)
print("∂C/∂x1 =", dC_dx1)

# Particle 2 gradients
dC_dy2 = sp.diff(C, y2)
dC_dx2 = sp.diff(C, x2)
print("\n∂C/∂y2 =", dC_dy2)
print("∂C/∂x2 =", dC_dx2)

# Particle 3 gradients
dC_dy3 = sp.diff(C, y3)
dC_dx3 = sp.diff(C, x3)
print("\n∂C/∂y3 =", dC_dy3)
print("∂C/∂x3 =", dC_dx3)

print("\n" + "=" * 60)
print("JAVASCRIPT CODE FOR GRADIENTS")
print("=" * 60)

# For RopeDrumY, positions are stored as [y, x], so:
# result[0] should get ∂C/∂y
# result[1] should get ∂C/∂x

print("\n// Particle 1: result[0]=∂C/∂y1, result[1]=∂C/∂x1")
print("let dC_dy1 = " + jscode(dC_dy1) + ";")
print("let dC_dx1 = " + jscode(dC_dx1) + ";")
print("sparsepset(result, [dC_dy1, dC_dx1], ropedrum.p1);")

print("\n// Particle 2: result[0]=∂C/∂y2, result[1]=∂C/∂x2")
print("let dC_dy2 = " + jscode(dC_dy2) + ";")
print("let dC_dx2 = " + jscode(dC_dx2) + ";")
print("sparsepset(result, [dC_dy2, dC_dx2], ropedrum.p2);")

print("\n// Particle 3: result[0]=∂C/∂y3, result[1]=∂C/∂x3")
print("let dC_dy3 = " + jscode(dC_dy3) + ";")
print("let dC_dx3 = " + jscode(dC_dx3) + ";")
print("sparsepset(result, [dC_dy3, dC_dx3], ropedrum.p3);")
