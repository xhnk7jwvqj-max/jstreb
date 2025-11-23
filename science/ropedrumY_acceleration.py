#!/usr/bin/env python3
"""
Derive the acceleration formula for RopeDrumY constraint.
d²C/dt² where positions are stored as [y, x].
"""

import sympy as sp
from sympy.printing import jscode

# Define time parameter
t = sp.Symbol('t', real=True)

# Positions stored as [y, x] - time parameterized
# p(t) = p(0) + t*v
y1_0, x1_0 = sp.symbols('y1 x1', real=True)
y2_0, x2_0 = sp.symbols('y2 x2', real=True)
y3_0, x3_0 = sp.symbols('y3 x3', real=True)

vy1, vx1 = sp.symbols('vy1 vx1', real=True)
vy2, vx2 = sp.symbols('vy2 vx2', real=True)
vy3, vx3 = sp.symbols('vy3 vx3', real=True)

# Time-parameterized positions
y1 = y1_0 + t*vy1
x1 = x1_0 + t*vx1
y2 = y2_0 + t*vy2
x2 = x2_0 + t*vx2
y3 = y3_0 + t*vy3
x3 = x3_0 + t*vx3

r = sp.Symbol('r', positive=True, real=True)
L = sp.Symbol('L', positive=True, real=True)

# Constraint
dx = x1 - x2
dy = y1 - y2
d_sq = dx**2 + dy**2

tangent_length = sp.sqrt(d_sq - r**2)

alpha = sp.atan2(y3 - y2, x3 - x2)
beta = sp.asin(r / sp.sqrt(d_sq))
theta_tangent = sp.atan2(dy, dx) + sp.pi/2 - beta

arc_angle = alpha - theta_tangent

C = tangent_length + r * arc_angle - L

print("Computing d²C/dt²...")
print("This may take a while due to complexity...")

# First derivative
dC_dt = sp.diff(C, t)
print("✓ First derivative computed")

# Second derivative
d2C_dt2 = sp.diff(dC_dt, t)
print("✓ Second derivative computed")

# Evaluate at t=0
d2C_dt2_at_0 = d2C_dt2.subs(t, 0)
print("✓ Evaluated at t=0")

# Substitute back variable names (remove _0 suffix)
d2C_dt2_at_0 = d2C_dt2_at_0.subs([
    (y1_0, sp.Symbol('y1')),
    (x1_0, sp.Symbol('x1')),
    (y2_0, sp.Symbol('y2')),
    (x2_0, sp.Symbol('x2')),
    (y3_0, sp.Symbol('y3')),
    (x3_0, sp.Symbol('x3'))
])

print("\nGenerating JavaScript code...")
js_code = jscode(d2C_dt2_at_0)

print("\n" + "=" * 60)
print("JAVASCRIPT CODE FOR ACCELERATION")
print("=" * 60)
print("\nlet acceleration = " + js_code + ";")

# Save to file
with open('ropedrumY_acceleration.js', 'w') as f:
    f.write("// RopeDrumY acceleration formula\n")
    f.write("// d²C/dt² at t=0\n")
    f.write("// Coordinates stored as [y, x]\n\n")
    f.write("let acceleration = " + js_code + ";")

print("\n✓ Saved to ropedrumY_acceleration.js")
