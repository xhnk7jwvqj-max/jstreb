# Capstan Constraint Design

## Physics Background

A capstan is a cylinder around which a rope wraps. The key physics principle is the **Capstan equation** (Eytelwein's formula):

```
T_load = T_hold × e^(μθ)
```

Where:
- `T_load` = tension on the loaded side (higher tension)
- `T_hold` = tension on the holding side (lower tension)
- `μ` = coefficient of friction between rope and capstan
- `θ` = wrap angle in radians
- `e` = Euler's number (≈2.71828)

## Constraint Structure

```javascript
function Capstan(p1, p_cylinder, p2, mu) {
  this.p1 = p1;              // First rope end (holding side)
  this.p_cylinder = p_cylinder;  // Capstan center particle
  this.p2 = p2;              // Second rope end (load side)
  this.mu = mu || 0.3;       // Friction coefficient (default 0.3)
  this.name = "Capstan";
}
```

## Constraint Equations

### 1. Wrap Angle Calculation

```javascript
// Vectors from capstan center to rope ends
r1 = p1 - p_cylinder
r2 = p2 - p_cylinder

// Wrap angle (always positive, 0 to π)
θ = atan2(|r1 × r2|, r1 · r2)
```

### 2. Force Ratio Constraint

The constraint enforces that the force ratio doesn't exceed the friction limit:

```
C(x) = T2 - T1 × e^(μθ) ≤ 0
```

Where:
- T1 = tension magnitude on holding side (p1)
- T2 = tension magnitude on load side (p2)

### 3. Geometric Constraints

The rope must be tangent to the capstan (enforced by requiring both rope segments to have the same distance from center):

```
C_geom1 = |r1| - R = 0
C_geom2 = |r2| - R = 0
```

Where R is the capstan radius (could be a property or fixed).

## Implementation Functions

### computeEffectCapstan(result, capstan, system)

Returns the Jacobian matrix (∂C/∂x):

```javascript
// Get positions
let [x1, y1] = pget(system.positions, capstan.p1);
let [xc, yc] = pget(system.positions, capstan.p_cylinder);
let [x2, y2] = pget(system.positions, capstan.p2);

// Vectors from center
let r1 = [x1 - xc, y1 - yc];
let r2 = [x2 - xc, y2 - yc];

// Normalized directions (for force directions)
let dir1 = normalize(r1);
let dir2 = normalize(r2);

// The Jacobian relates changes in positions to changes in the constraint
// Simplified: enforce force balance at capstan center
// Force from p1: -T1 * dir1
// Force from p2: -T2 * dir2
// Force ratio: T2 = T1 * e^(μθ)

let friction_factor = Math.exp(capstan.mu * theta);

// Jacobian entries
sparsepset(result, dir1, capstan.p1);
sparsepset(result, [-dir2[0] / friction_factor, -dir2[1] / friction_factor], capstan.p2);
sparsepset(result,
  [-(dir1[0] - dir2[0]/friction_factor),
   -(dir1[1] - dir2[1]/friction_factor)],
  capstan.p_cylinder);
```

### computeAccelerationCapstan(capstan, system)

Returns the constraint acceleration (right-hand side):

```javascript
// Similar to rope constraint, but accounts for friction factor
let [x1, y1] = pget(system.positions, capstan.p1);
let [xc, yc] = pget(system.positions, capstan.p_cylinder);
let [x2, y2] = pget(system.positions, capstan.p2);

let r1 = subtract([x1, y1], [xc, yc]);
let r2 = subtract([x2, y2], [xc, yc]);
let v1 = subtract(pget(system.velocities, capstan.p1),
                  pget(system.velocities, capstan.p_cylinder));
let v2 = subtract(pget(system.velocities, capstan.p2),
                  pget(system.velocities, capstan.p_cylinder));

let l1 = Math.sqrt(r1[0]*r1[0] + r1[1]*r1[1]);
let l2 = Math.sqrt(r2[0]*r2[0] + r2[1]*r2[1]);

// Centripetal acceleration terms for both segments
let accel1 = (v1[0]*v1[0] + v1[1]*v1[1]) / l1;
let accel2 = (v2[0]*v2[0] + v2[1]*v2[1]) / l2;

// Compute wrap angle
let theta = Math.atan2(
  Math.abs(wedge(r1, r2)),
  r1[0]*r2[0] + r1[1]*r2[1]
);
let friction_factor = Math.exp(capstan.mu * theta);

// Combined acceleration accounting for friction
return accel1 + accel2 / friction_factor;
```

## Alternative: Simpler "Fixed Ratio" Capstan

For initial implementation, could use a simplified version:

```javascript
function SimpleCapstan(p1, p_cylinder, p2, ratio) {
  this.p1 = p1;
  this.p_cylinder = p_cylinder;
  this.p2 = p2;
  this.ratio = ratio || 2.0;  // Fixed force ratio T2/T1
  this.name = "SimpleCapstan";
}
```

This enforces a fixed mechanical advantage without computing wrap angles.

## UI Integration

Add to `interface.js`:

```javascript
var ctypes = ["rod", "pin", "slider", "colinear", "f2k", "rope", "capstan"];
```

Add button in `index.html`:
```html
<button onclick="createConstraint('capstan')">+ Capstan</button>
```

Add control box in `createConstraintControlBox()`:
```javascript
case "capstan":
  // Similar to rope: 3 particle selectors + friction coefficient slider
  controlBox.innerHTML = `
    <label>P1: <select onchange="..."></select></label>
    <label>Center: <select onchange="..."></select></label>
    <label>P2: <select onchange="..."></select></label>
    <label>Friction μ: <input type="range" min="0" max="1" step="0.1" value="0.3"></label>
  `;
```

## Testing

Test cases:
1. Simple vertical load with horizontal holding rope
2. Multiple wraps (θ > 2π) for extreme mechanical advantage
3. Dynamic wrapping/unwrapping as mechanism moves
4. Comparison with analytical capstan equation

## References

- Capstan equation: https://en.wikipedia.org/wiki/Capstan_equation
- Belt friction: similar physics but for flat belts vs. round rope
- Used in: sailing winches, rock climbing belay devices, logging equipment
