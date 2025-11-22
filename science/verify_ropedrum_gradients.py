#!/usr/bin/env python3
"""
Verify that manually-derived RopeDrum gradients match SymPy-derived gradients
"""

from sympy import *

print("=" * 80)
print("Verifying RopeDrum Gradient Formulas")
print("=" * 80)

# Define symbols
x1, y1, x2, y2, x3, y3 = symbols('x1 y1 x2 y2 x3 y3', real=True)
r, L = symbols('r L', positive=True, real=True)
t = symbols('t', real=True)

# Time-parameterized constraint (just positions, zero velocities for gradient check)
dx_t = (x1 + 0*t) - (x2 + 0*t)
dy_t = (y1 + 0*t) - (y2 + 0*t)
dx3_t = (x3 + 0*t) - (x2 + 0*t)
dy3_t = (y3 + 0*t) - (y2 + 0*t)

d_sq_t = dx_t**2 + dy_t**2
d_t = sqrt(d_sq_t)
tangent_length_t = sqrt(d_sq_t - r**2)

alpha_t = atan2(dy_t, dx_t)
beta_t = asin(r / d_t)
theta_T_t = alpha_t + pi/2 - beta_t
theta_p3_t = atan2(dy3_t, dx3_t)
arc_angle_t = theta_p3_t - theta_T_t

C_t = tangent_length_t + r * arc_angle_t - L

print("\nComputing SymPy gradients...")
sympy_grads = {}
for var_name, var in [('x1', x1), ('y1', y1), ('x2', x2), ('y2', y2), ('x3', x3), ('y3', y3)]:
    print(f"  ∂C/∂{var_name}...", end='', flush=True)
    grad = simplify(diff(C_t, var).subs(t, 0))
    sympy_grads[var_name] = grad
    print(" done!")

print("\nDefining manual gradients (from ropedrum_manual_derivation.py)...")

# Common terms
dx = x1 - x2
dy = y1 - y2
dx3 = x3 - x2
dy3 = y3 - y2
d2 = dx**2 + dy**2
d = sqrt(d2)
d3 = d2 * d
tangent_length = sqrt(d2 - r**2)

# Manual gradient formulas
manual_grads = {
    'x1': dx / tangent_length + r * dy / d2 - r**2 * dx / (d3 * tangent_length),
    'y1': dy / tangent_length - r * dx / d2 - r**2 * dy / (d3 * tangent_length),
    'x2': -dx / tangent_length + dy3 / r + r * dy / d2 - r**2 * dx / (d3 * tangent_length),
    'y2': -dy / tangent_length - dx3 / r - r * dx / d2 - r**2 * dy / (d3 * tangent_length),
    'x3': -dy3 / r,
    'y3': dx3 / r
}

print("\nComparing formulas algebraically...")
print("-" * 80)

all_match = True
for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
    diff_expr = simplify(sympy_grads[var_name] - manual_grads[var_name])
    matches = (diff_expr == 0)
    status = "✓" if matches else "✗"
    print(f"  ∂C/∂{var_name}: {status}")
    if not matches:
        print(f"    Difference: {diff_expr}")
        all_match = False

if all_match:
    print("\n" + "=" * 80)
    print("SUCCESS: All manual gradients match SymPy derivation!")
    print("=" * 80)
else:
    print("\n" + "=" * 80)
    print("Checking numerical equivalence...")
    print("=" * 80)

    # Test with Drum Counterweight values
    test_vals = {
        x1: 436, y1: 622,
        x2: 536, y2: 472.7,
        x3: 578, y3: 515,
        r: 60, L: 13
    }

    print("\nTest case: Drum Counterweight preset")
    print(f"  p1 = ({test_vals[x1]}, {test_vals[y1]})")
    print(f"  p2 = ({test_vals[x2]}, {test_vals[y2]})")
    print(f"  p3 = ({test_vals[x3]}, {test_vals[y3]})")
    print(f"  r = {test_vals[r]}")

    print("\nNumerical comparison:")
    print("-" * 80)
    print(f"{'Var':<6} {'SymPy':<15} {'Manual':<15} {'Diff':<15} {'Match':<6}")
    print("-" * 80)

    numerical_match = True
    for var_name in ['x1', 'y1', 'x2', 'y2', 'x3', 'y3']:
        sympy_val = float(sympy_grads[var_name].subs(test_vals))
        manual_val = float(manual_grads[var_name].subs(test_vals))
        diff_val = abs(sympy_val - manual_val)
        matches = diff_val < 1e-10
        status = "✓" if matches else "✗"
        print(f"{var_name:<6} {sympy_val:+.10f} {manual_val:+.10f} {diff_val:.2e} {status:<6}")
        if not matches:
            numerical_match = False

    if numerical_match:
        print("\n" + "=" * 80)
        print("SUCCESS: All gradients match numerically!")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("ERROR: Some gradients don't match!")
        print("=" * 80)

print("\nDone!")
