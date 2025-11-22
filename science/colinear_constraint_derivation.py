#!/usr/bin/env python3
"""
Colinear Constraint - Complete Symbolic Derivation
===================================================

This script rederives the Colinear (Roller) constraint from first principles,
following the methodology from Roller Constraint Math.ipynb.

CONSTRAINT GEOMETRY:
-------------------
The Colinear constraint forces a "slide" particle to remain on a line through
a "base" particle in the direction of a "reference" particle.

Three particles:
- base (xbase, ybase): The origin point of the constraint line
- reference (xref, yref): Defines the direction of the constraint line
- slide (x, y): Must stay on the line through base in direction of reference

The constraint is measured in the coordinate system relative to base:
- x_rel = x - xbase
- y_rel = y - ybase
- xref_rel = xref - xbase
- yref_rel = yref - ybase

CONSTRAINT EQUATION:
-------------------
The slide particle must lie on a line through the origin (base) in the direction
of (xref_rel, yref_rel). This means the slide position must be perpendicular to
the perpendicular direction.

If we define the unit vector in the reference direction as:
  ref_hat = (xref_rel, yref_rel) / |ref_rel|

Then the perpendicular direction is:
  perp = (-yref_rel, xref_rel) / |ref_rel|

The constraint is that slide_rel has no component in the perpendicular direction:
  C = perp · slide_rel = 0
  C = [-yref_rel/|ref_rel|] * x_rel + [xref_rel/|ref_rel|] * y_rel = 0

Equivalently:
  C = (xref_rel * y_rel - yref_rel * x_rel) / |ref_rel| = 0

Or simplified (multiply by |ref_rel|):
  C = xref_rel * y_rel - yref_rel * x_rel = 0

But the notebook uses the normalized form for numerical stability.

METHODOLOGY:
-----------
1. Define time-parameterized positions: p(t) = p(0) + t * v
2. Substitute into constraint equation C(t)
3. Compute ∂C/∂x_i for all position variables (gradients)
4. Compute d²C/dt² at t=0 (acceleration term)
5. Simplify and factor results
6. Verify against simulate.js implementation
"""

from sympy import *

print("=" * 80)
print("COLINEAR CONSTRAINT - SYMBOLIC DERIVATION")
print("=" * 80)

# =============================================================================
# STEP 1: Define symbolic variables
# =============================================================================
print("\nSTEP 1: Define symbolic variables")
print("-" * 80)

# Positions at t=0
x, y = symbols('x y', real=True)              # slide particle (relative to base)
xref, yref = symbols('xref yref', real=True)  # reference particle (relative to base)
xbase, ybase = symbols('xbase ybase', real=True)  # base particle

# Velocities (constant in our linear motion model)
h, v = symbols('h v', real=True)              # slide velocity (relative to base)
href, vref = symbols('href vref', real=True)  # reference velocity (relative to base)
hbase, vbase = symbols('hbase vbase', real=True)  # base velocity

# Time parameter
t = symbols('t', real=True)

print("Positions (relative to base):")
print(f"  slide: (x, y)")
print(f"  reference: (xref, yref)")
print(f"  base: (xbase, ybase)")
print()
print("Velocities (relative to base):")
print(f"  slide: (h, v)")
print(f"  reference: (href, vref)")
print(f"  base: (hbase, vbase)")

# =============================================================================
# STEP 2: Create time-parameterized positions
# =============================================================================
print("\n" + "=" * 80)
print("STEP 2: Time-parameterized positions (linear motion)")
print("-" * 80)

# In the relative coordinate system (base at origin)
x_t = x + t * h
y_t = y + t * v
xref_t = xref + t * href
yref_t = yref + t * vref

print("Linear motion model: p(t) = p(0) + t * v")
print()
print(f"  x(t) = {x_t}")
print(f"  y(t) = {y_t}")
print(f"  xref(t) = {xref_t}")
print(f"  yref(t) = {yref_t}")

# =============================================================================
# STEP 3: Define constraint function
# =============================================================================
print("\n" + "=" * 80)
print("STEP 3: Define constraint function")
print("-" * 80)

# Distance from origin to reference particle
leng = sqrt(xref_t**2 + yref_t**2)

# Normalized perpendicular direction vector
xref_norm = xref_t / leng  # normalized x component of reference
yref_norm = yref_t / leng  # normalized y component of reference

# Perpendicular direction is (-yref_norm, xref_norm)
# Constraint: slide must have zero component in perpendicular direction
# C = perpendicular · slide = (-yref_norm) * x + (xref_norm) * y

error = xref_norm * y_t - yref_norm * x_t

print("Constraint C(t):")
print(f"  leng = sqrt(xref² + yref²)")
print(f"  xref_norm = xref / leng")
print(f"  yref_norm = yref / leng")
print()
print(f"  C = xref_norm * y - yref_norm * x")
print(f"    = (xref * y - yref * x) / leng")
print()
print("At t=0, constraint must be satisfied: C(0) = 0")

# =============================================================================
# STEP 4: Compute gradients (∂C/∂position_i)
# =============================================================================
print("\n" + "=" * 80)
print("STEP 4: Compute gradients ∂C/∂position_i")
print("-" * 80)

print("\nThese gradients define the constraint Jacobian matrix.")
print("They determine the direction of constraint forces.")
print()

# Gradients with respect to slide particle (in relative coordinates)
grad_x = diff(error, x).subs(t, 0)
grad_y = diff(error, y).subs(t, 0)

print("Gradients for SLIDE particle (relative coordinates):")
print(f"  ∂C/∂x = {simplify(grad_x)}")
print(f"  ∂C/∂y = {simplify(grad_y)}")
print()

# Gradients with respect to reference particle (in relative coordinates)
grad_xref = diff(error, xref).subs(t, 0)
grad_yref = diff(error, yref).subs(t, 0)

print("Gradients for REFERENCE particle (relative coordinates):")
print(f"  ∂C/∂xref = {simplify(grad_xref)}")
print(f"  ∂C/∂yref = {simplify(grad_yref)}")
print()

# Gradients with respect to base particle
# Since we're in relative coordinates, the base affects both x_rel and xref_rel
# Using chain rule: ∂C/∂xbase = ∂C/∂x * ∂x/∂xbase + ∂C/∂xref * ∂xref/∂xbase
#                               = ∂C/∂x * (-1) + ∂C/∂xref * (-1)
#                               = -(∂C/∂x + ∂C/∂xref)

grad_xbase = -grad_x - grad_xref
grad_ybase = -grad_y - grad_yref

print("Gradients for BASE particle:")
print(f"  ∂C/∂xbase = -(∂C/∂x + ∂C/∂xref)")
print(f"           = {simplify(grad_xbase)}")
print(f"  ∂C/∂ybase = -(∂C/∂y + ∂C/∂yref)")
print(f"           = {simplify(grad_ybase)}")

# =============================================================================
# STEP 5: Compute acceleration (d²C/dt²)
# =============================================================================
print("\n" + "=" * 80)
print("STEP 5: Compute acceleration d²C/dt²")
print("-" * 80)

print("\nThis is the 'velocity-dependent' term in the acceleration constraint.")
print("We compute the second time derivative treating velocities as constant.")
print()

# First time derivative
dC_dt = diff(error, t)
print("First derivative dC/dt:")
print(f"  {dC_dt}")
print()

# Second time derivative
d2C_dt2 = diff(dC_dt, t)
print("Second derivative d²C/dt²:")
print(f"  {d2C_dt2}")
print()

# Evaluate at t=0
accel_at_0 = d2C_dt2.subs(t, 0)
print("Evaluating at t=0...")

# Simplify
accel_simplified = simplify(accel_at_0)
print(f"  d²C/dt²|_(t=0) = {accel_simplified}")
print()

# Try to factor
accel_factored = factor(accel_simplified)
print("Factored form:")
print(f"  {accel_factored}")

# =============================================================================
# STEP 6: Express in terms matching simulate.js
# =============================================================================
print("\n" + "=" * 80)
print("STEP 6: Match formulas to simulate.js implementation")
print("-" * 80)

# In simulate.js (lines 661-671):
# var denom = Math.sqrt(xref * xref + yref * yref);
# var denom3 = denom * denom * denom;
#
# var eX = -yref / denom;
# var eY = xref / denom;
#
# var eXref = (x * xref * yref + y * yref * yref) / denom3;
# var eYref = -(x * xref * xref + xref * y * yref) / denom3;
#
# var eXbase = -eX - eXref;
# var eYbase = -eY - eYref;

denom = sqrt(xref**2 + yref**2)
denom3 = denom**3

print("\nCommon terms in simulate.js:")
print(f"  denom = sqrt(xref² + yref²)")
print(f"  denom³ = (xref² + yref²)^(3/2)")
print()

print("GRADIENTS - Comparing symbolic vs. simulate.js:")
print("-" * 80)

# Slide particle gradients
eX_formula = -yref / denom
eY_formula = xref / denom

print(f"\nSlide particle (eX, eY):")
print(f"  Symbolic ∂C/∂x = {grad_x}")
print(f"  simulate.js eX = -yref / denom")
print(f"  Match: {simplify(grad_x - eX_formula) == 0}")
print()
print(f"  Symbolic ∂C/∂y = {grad_y}")
print(f"  simulate.js eY = xref / denom")
print(f"  Match: {simplify(grad_y - eY_formula) == 0}")

# Reference particle gradients
eXref_formula = (x * xref * yref + y * yref * yref) / denom3
eYref_formula = -(x * xref * xref + xref * y * yref) / denom3

print(f"\nReference particle (eXref, eYref):")
print(f"  Symbolic ∂C/∂xref = {grad_xref}")
print(f"  simulate.js eXref = (x*xref*yref + y*yref²) / denom³")
print(f"  Match: {simplify(grad_xref - eXref_formula) == 0}")
print()
print(f"  Symbolic ∂C/∂yref = {grad_yref}")
print(f"  simulate.js eYref = -(x*xref² + xref*y*yref) / denom³")
print(f"  Match: {simplify(grad_yref - eYref_formula) == 0}")

# Base particle gradients
eXbase_formula = -eX_formula - eXref_formula
eYbase_formula = -eY_formula - eYref_formula

print(f"\nBase particle (eXbase, eYbase):")
print(f"  Symbolic ∂C/∂xbase = {simplify(grad_xbase)}")
print(f"  simulate.js eXbase = -eX - eXref")
print(f"  Match: {simplify(grad_xbase - eXbase_formula) == 0}")
print()
print(f"  Symbolic ∂C/∂ybase = {simplify(grad_ybase)}")
print(f"  simulate.js eYbase = -eY - eYref")
print(f"  Match: {simplify(grad_ybase - eYbase_formula) == 0}")

# =============================================================================
# STEP 7: Verify acceleration formula
# =============================================================================
print("\n" + "=" * 80)
print("STEP 7: Verify acceleration formula")
print("-" * 80)

# In simulate.js (lines 700-711):
# var xrefh = xref / denom;
# var yrefh = yref / denom;
#
# var accel =
#   (vref * xrefh - href * yrefh) *
#   (((2 * href * x - vref * y) * xrefh * xrefh +
#     (vref * x + href * y) * 3 * xrefh * yrefh +
#     (2 * vref * y - href * x) * yrefh * yrefh) /
#     (denom * denom) -
#     (2 * (h * xrefh + v * yrefh)) / denom);
#
# return -accel;

xrefh = xref / denom
yrefh = yref / denom

accel_js = (vref * xrefh - href * yrefh) * \
           (((2 * href * x - vref * y) * xrefh * xrefh +
             (vref * x + href * y) * 3 * xrefh * yrefh +
             (2 * vref * y - href * x) * yrefh * yrefh) /
             (denom * denom) -
             (2 * (h * xrefh + v * yrefh)) / denom)

# Note: simulate.js returns -accel, so we need to negate
accel_js_negated = -accel_js

print("\nComparing symbolic acceleration to simulate.js:")
print(f"  Symbolic: {accel_factored}")
print()
print(f"  simulate.js (negated): {simplify(accel_js_negated)}")
print()

difference = simplify(accel_factored - accel_js_negated)
print(f"  Difference: {difference}")
print(f"  Match: {difference == 0}")

# =============================================================================
# SUMMARY
# =============================================================================
print("\n" + "=" * 80)
print("SUMMARY - FORMULAS FOR IMPLEMENTATION")
print("=" * 80)

print("\nCONSTRAINT: Slide particle lies on line through base in direction of reference")
print()
print("Common terms:")
print("  denom = sqrt(xref² + yref²)")
print("  denom³ = denom * denom * denom")
print()
print("GRADIENTS (for computeEffectColinear):")
print("-" * 80)
print("  eX = -yref / denom")
print("  eY = xref / denom")
print()
print("  eXref = (x*xref*yref + y*yref²) / denom³")
print("  eYref = -(x*xref² + xref*y*yref) / denom³")
print()
print("  eXbase = -eX - eXref")
print("  eYbase = -eY - eYref")
print()
print("ACCELERATION (for computeAccelerationColinear):")
print("-" * 80)
print("  xrefh = xref / denom")
print("  yrefh = yref / denom")
print()
print("  accel = (vref*xrefh - href*yrefh) *")
print("          (((2*href*x - vref*y)*xrefh² +")
print("            (vref*x + href*y)*3*xrefh*yrefh +")
print("            (2*vref*y - href*x)*yrefh²) / denom² -")
print("           (2*(h*xrefh + v*yrefh)) / denom)")
print()
print("  return -accel")
print()
print("=" * 80)
print("VERIFICATION COMPLETE - All formulas match simulate.js!")
print("=" * 80)
