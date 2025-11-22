#!/usr/bin/env python3
"""
Convert SymPy acceleration formula to JavaScript code
"""

from sympy import *
from sympy.printing import jscode

# Define symbols
x1, y1, x2, y2, x3, y3 = symbols('x1 y1 x2 y2 x3 y3', real=True)
vx1, vy1, vx2, vy2, vx3, vy3 = symbols('vx1 vy1 vx2 vy2 vx3 vy3', real=True)
r, L = symbols('r L', positive=True, real=True)
t = symbols('t', real=True)

print("Recomputing acceleration formula...")

# Time-parameterized positions
x1_t = x1 + t * vx1
y1_t = y1 + t * vy1
x2_t = x2 + t * vx2
y2_t = y2 + t * vy2
x3_t = x3 + t * vx3
y3_t = y3 + t * vy3

# Constraint
dx_t = x1_t - x2_t
dy_t = y1_t - y2_t
dx3_t = x3_t - x2_t
dy3_t = y3_t - y2_t

d_sq_t = dx_t**2 + dy_t**2
tangent_length_t = sqrt(d_sq_t - r**2)

alpha_t = atan2(dy_t, dx_t)
beta_t = asin(r / sqrt(d_sq_t))
theta_T_t = alpha_t + pi/2 - beta_t
theta_p3_t = atan2(dy3_t, dx3_t)
arc_angle_t = theta_p3_t - theta_T_t

C_t = tangent_length_t + r * arc_angle_t - L

# Second derivative
dC_dt = diff(C_t, t)
d2C_dt2 = diff(dC_dt, t)
d2C_dt2_at_0 = d2C_dt2.subs(t, 0)

print("Done!\n")

# Use SymPy's JavaScript code generator
js_code = jscode(d2C_dt2_at_0)

print("=" * 80)
print("JAVASCRIPT CODE FOR computeAccelerationRopeDrum:")
print("=" * 80)
print()
print("function computeAccelerationRopeDrum(ropedrum, system) {")
print("  let pos1 = pget(system.positions, ropedrum.p1);")
print("  let pos2 = pget(system.positions, ropedrum.p2);")
print("  let pos3 = pget(system.positions, ropedrum.p3);")
print()
print("  let vel1 = pget(system.velocities, ropedrum.p1);")
print("  let vel2 = pget(system.velocities, ropedrum.p2);")
print("  let vel3 = pget(system.velocities, ropedrum.p3);")
print()
print("  let r = ropedrum.radius;")
print()
print("  // Extract coordinates (matching SymPy variable names)")
print("  let x1 = pos1[0], y1 = pos1[1];")
print("  let x2 = pos2[0], y2 = pos2[1];")
print("  let x3 = pos3[0], y3 = pos3[1];")
print("  let vx1 = vel1[0], vy1 = vel1[1];")
print("  let vx2 = vel2[0], vy2 = vel2[1];")
print("  let vx3 = vel3[0], vy3 = vel3[1];")
print()
print("  // Exact SymPy-derived acceleration formula")
print("  // d²C/dt² at t=0 (no manual simplification!)")
print("  let acceleration = " + js_code + ";")
print()
print("  return acceleration;")
print("}")
print()
print("=" * 80)

# Save to file
with open('/home/user/jstreb/science/ropedrum_acceleration.js', 'w') as f:
    f.write("function computeAccelerationRopeDrum(ropedrum, system) {\n")
    f.write("  let pos1 = pget(system.positions, ropedrum.p1);\n")
    f.write("  let pos2 = pget(system.positions, ropedrum.p2);\n")
    f.write("  let pos3 = pget(system.positions, ropedrum.p3);\n")
    f.write("\n")
    f.write("  let vel1 = pget(system.velocities, ropedrum.p1);\n")
    f.write("  let vel2 = pget(system.velocities, ropedrum.p2);\n")
    f.write("  let vel3 = pget(system.velocities, ropedrum.p3);\n")
    f.write("\n")
    f.write("  let r = ropedrum.radius;\n")
    f.write("\n")
    f.write("  // Extract coordinates (matching SymPy variable names)\n")
    f.write("  let x1 = pos1[0], y1 = pos1[1];\n")
    f.write("  let x2 = pos2[0], y2 = pos2[1];\n")
    f.write("  let x3 = pos3[0], y3 = pos3[1];\n")
    f.write("  let vx1 = vel1[0], vy1 = vel1[1];\n")
    f.write("  let vx2 = vel2[0], vy2 = vel2[1];\n")
    f.write("  let vx3 = vel3[0], vy3 = vel3[1];\n")
    f.write("\n")
    f.write("  // Exact SymPy-derived acceleration formula\n")
    f.write("  // d²C/dt² at t=0 (no manual simplification!)\n")
    f.write("  let acceleration = " + js_code + ";\n")
    f.write("\n")
    f.write("  return acceleration;\n")
    f.write("}\n")

print("\nJavaScript code saved to: science/ropedrum_acceleration.js")
print("Copy this function into simulate.js to replace computeAccelerationRopeDrum")
