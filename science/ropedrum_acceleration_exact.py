#!/usr/bin/env python3
"""
Exact derivation of RopeDrum acceleration term using SymPy

Following the Colinear methodology: compute d²C/dt² exactly, then implement.
No manual approximations!
"""

from sympy import *

print("=" * 80)
print("RopeDrum Constraint - Exact Acceleration Derivation")
print("=" * 80)

# Define symbols
x1, y1, x2, y2, x3, y3 = symbols('x1 y1 x2 y2 x3 y3', real=True)
vx1, vy1, vx2, vy2, vx3, vy3 = symbols('vx1 vy1 vx2 vy2 vx3 vy3', real=True)
r, L = symbols('r L', positive=True, real=True)
t = symbols('t', real=True)

print("\nStep 1: Define time-parameterized constraint")
print("-" * 80)

# Time-parameterized positions
x1_t = x1 + t * vx1
y1_t = y1 + t * vy1
x2_t = x2 + t * vx2
y2_t = y2 + t * vy2
x3_t = x3 + t * vx3
y3_t = y3 + t * vy3

# Constraint components
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
arc_length_t = r * arc_angle_t

# Full constraint
C_t = tangent_length_t + arc_length_t - L

print("C(t) = tangent_length(t) + r * arc_angle(t) - L")
print()

print("\nStep 2: Compute first derivative dC/dt")
print("-" * 80)

dC_dt = diff(C_t, t)
print("Computing... (this may take a moment)")
print("Done!")
print()

print("\nStep 3: Compute second derivative d²C/dt²")
print("-" * 80)

d2C_dt2 = diff(dC_dt, t)
print("Computing... (this may take a moment)")
print("Done!")
print()

print("\nStep 4: Evaluate at t=0")
print("-" * 80)

d2C_dt2_at_0 = d2C_dt2.subs(t, 0)
print("Substituting t=0... (this may take a moment)")
print("Done!")
print()

print("\nStep 5: Output formula (without aggressive simplification)")
print("-" * 80)

# Don't try to simplify too much - just output what we have
print("\nd²C/dt² at t=0:")
print()
print(d2C_dt2_at_0)
print()

# Try basic factorization but don't hang on complex simplification
print("\nAttempting basic factorization...")
try:
    # Use a shorter timeout for factorization
    import signal

    def timeout_handler(signum, frame):
        raise TimeoutError()

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(10)  # 10 second timeout

    try:
        factored = factor(d2C_dt2_at_0)
        print("Factored form:")
        print(factored)
        signal.alarm(0)
    except TimeoutError:
        print("Factorization timed out - using unfactored form")
        signal.alarm(0)
        factored = d2C_dt2_at_0
except:
    print("Factorization not available - using unfactored form")
    factored = d2C_dt2_at_0

print()

# Save to file for implementation
print("\nStep 6: Save formula and generate JavaScript code")
print("-" * 80)

with open('/home/user/jstreb/science/ropedrum_acceleration_exact.txt', 'w') as f:
    f.write("RopeDrum Acceleration - Exact SymPy Formula\n")
    f.write("=" * 80 + "\n\n")
    f.write("d²C/dt² at t=0:\n")
    f.write("-" * 80 + "\n")
    f.write(str(d2C_dt2_at_0) + "\n\n")

    f.write("=" * 80 + "\n")
    f.write("Variable Mapping for JavaScript Implementation:\n")
    f.write("-" * 80 + "\n")
    f.write("x1, y1 = pos1[0], pos1[1]  // free end\n")
    f.write("x2, y2 = pos2[0], pos2[1]  // drum center\n")
    f.write("x3, y3 = pos3[0], pos3[1]  // attachment point\n")
    f.write("vx1, vy1 = vel1[0], vel1[1]\n")
    f.write("vx2, vy2 = vel2[0], vel2[1]\n")
    f.write("vx3, vy3 = vel3[0], vel3[1]\n")
    f.write("r = ropedrum.radius\n\n")

print("\nFormula saved to: science/ropedrum_acceleration_exact.txt")

# Numerical test
print("\nStep 7: Numerical verification")
print("-" * 80)

test_vals = {
    x1: 436, y1: 622,
    x2: 536, y2: 472.7,
    x3: 578, y3: 515,
    r: 60, L: 13,
    vx1: 0, vy1: 0,
    vx2: 0, vy2: 0,
    vx3: 0, vy3: 0
}

print("\nTest case: Drum Counterweight at rest")
print(f"Positions: p1=({test_vals[x1]},{test_vals[y1]}), p2=({test_vals[x2]},{test_vals[y2]}), p3=({test_vals[x3]},{test_vals[y3]})")
print(f"All velocities = 0")
print()

accel_value = d2C_dt2_at_0.subs(test_vals)
print(f"d²C/dt² = {float(accel_value):.10f}")
print(f"  (Should be close to 0 when at rest)")

print()
print("=" * 80)
print("DERIVATION COMPLETE")
print("=" * 80)
print()
print("Next step: Translate the exact formula to JavaScript in computeAccelerationRopeDrum")
