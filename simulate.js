import {
  multiplyBSparse,
  batchAdd,
  multiply,
  subtract,
  subtractv,
  naiveMultiply,
  multiplyTransposeSameSparsity,
  naiveSolve,
  dotDivide,
	sparseDotDivide,
  store,
} from "./matrix.js";

import { dopri } from "./dopri.js";

const RELEASED = 2;

function normalize(v) {
  var len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  return [v[0] / len, v[1] / len];
}

function wedge(a, b) {
  return a[0] * b[1] - a[1] * b[0];
}

function pget(array, n) {
  return [array[2 * n], array[2 * n + 1]];
}

function pset(array, v, n) {
  array[2 * n] = v[0];
  array[2 * n + 1] = v[1];
}

function sparsepset(array, v, n) {
  array[0] |= 3 << (2 * n);
  array[2 * n + 1] = v[0];
  array[2 * n + 2] = v[1];
}



function Rod(p1, p2, oneway) {
  this.p1 = p1;
  this.p2 = p2;
  this.oneway = oneway;
  this.name = "Rod";
}

function Rope(p1, p2, p3) {
  this.p1 = p1;
  this.p2 = JSON.parse(JSON.stringify(p2));
  this.p3 = p3;
  this.name = "Rope";
}

function F2k(reference, slide, base) {
  this.reference = reference;
  this.slide = slide;
  this.base = base;
  this.fatmode = false;
  this.name = "F2k";
}
function Colinear(reference, slide, base, oneway) {
  this.reference = reference;
  this.slide = slide;
  this.base = base;
  this.oneway = oneway;
  this.name = "Colinear";
}

function Slider(p, n, oneway) {
  this.p = p;
  this.n = normalize(n);
  this.oneway = oneway;
  this.name = "Slider";
}

function RopeDrum(p1, p2, p3, length) {
  this.p1 = p1; // free end of rope
  this.p2 = p2; // center of drum
  this.p3 = p3; // point on circumference of drum
  this.length = length; // total "detour" length
  this.name = "RopeDrum";
}

function System(constraints, masses, positions, velocities) {
  this.forces = Array(masses.length).fill([0, -1]).flat(); // Assuming a default force
  this.constraints = constraints;
  this.masses = masses.flatMap((e) => [e, e]);
  this.positions = positions;
  this.velocities = velocities;
}

export function convertBack(sysConstraints) {
  let constraints = {
    rod: [],
    slider: [],
    colinear: [],
    f2k: [],
    rope: [],
    pin: [],
    ropedrum: [],
  };

  for (let constraint of sysConstraints) {
    if( constraint.oneway == RELEASED) {
	    continue;
    }
    switch (constraint.name) {
      case "Rod":
        constraints.rod.push({
          p1: constraint.p1,
          p2: constraint.p2,
          oneway: constraint.oneway,
        });
        break;
      case "Slider":
        constraints.slider.push({
          p: constraint.p,
          normal: { x: constraint.n[0], y: constraint.n[1] },
          oneway: constraint.oneway,
        });
        break;
      case "Colinear":
        constraints.colinear.push({
          reference: constraint.reference,
          slider: constraint.slide,
          base: constraint.base,
          oneway: constraint.oneway,
        });
        break;
      case "F2k":
        constraints.f2k.push({
          reference: constraint.reference,
          slider: constraint.slide,
          base: constraint.base,
        });
        break;
      case "Rope":
        constraints.rope.push({
          p1: constraint.p1,
          pulleys: constraint.p2.filter(
            (p) => p.wrapping != "cw_drop" && p.wrapping != "ccw_drop",
          ),
          p3: constraint.p3,
        });
        break;
      case "RopeDrum":
        constraints.ropedrum.push({
          p1: constraint.p1,
          p2: constraint.p2,
          p3: constraint.p3,
          length: constraint.length,
        });
        break;
    }
  }

  return constraints;
}

export function simulate(
  particles,
  constraints,
  timestep,
  duration,
  terminate,
) {
  let masses = [];
  let positions = [];
  let sysConstraints = [];
  for (var particle of particles) {
    masses.push(particle.mass);
    positions.push(particle.x);
    positions.push(particle.y);
  }
  for (var rod of constraints.rod) {
    sysConstraints.push(new Rod(rod.p1, rod.p2, rod.oneway));
  }
  for (var slider of constraints.slider) {
    sysConstraints.push(
      new Slider(slider.p, [slider.normal.x, slider.normal.y], slider.oneway),
    );
  }
  for (var slider of constraints.pin) {
    sysConstraints.push(new Slider(slider.p, [0, 1], false));
    sysConstraints.push(new Slider(slider.p, [1, 0], false));
  }
  for (var colinear of constraints.colinear) {
    sysConstraints.push(
      new Colinear(
        colinear.reference,
        colinear.slider,
        colinear.base,
        colinear.oneway,
      ),
    );
  }
  for (var f2k of constraints.f2k) {
    sysConstraints.push(new F2k(f2k.reference, f2k.slider, f2k.base));
  }
  for (var rope of constraints.rope) {
    sysConstraints.push(new Rope(rope.p1, rope.pulleys.slice(), rope.p3));
  }
  for (var ropedrum of constraints.ropedrum) {
    sysConstraints.push(new RopeDrum(ropedrum.p1, ropedrum.p2, ropedrum.p3, ropedrum.length));
  }

  var system = new System(
    sysConstraints,
    masses,
    positions,
    new Array(positions.length).fill(0),
  );
  system.terminate = terminate;
  let y_0 = system.positions.concat(system.velocities);
  let trajectory = rk45(system, y_0, timestep, duration);

  return trajectory;
}

function rk4(system, y_0, timestep, tfinal) {
  var y = y_0;
  var t = 0;
  var h = timestep;
  var output = [];
  var terminate = false;
  while (t < tfinal && !terminate) {
    t += h;
    var [k1, _] = dydt(system, y);
    var [k2, _] = dydt(system, batchAdd([y, multiply(h / 2, k1)]));
    var [k3, _] = dydt(system, batchAdd([y, multiply(h / 2, k2)]));
    var [k4, terminate] = dydt(system, batchAdd([y, multiply(h, k3)]));

    y = batchAdd([
      y,
      multiply(h / 6, batchAdd([k1, multiply(2, k2), multiply(2, k3), k4])),
    ]);
    output.push(y);
  }

  return output;
}
export function rk45(system, y_0, timestep, tfinal) {
  var times = [];
  var constraintLog = [];
  var forceLog = [];
  var fprime = (t, y) => {
    store.clear();
    while (t < times[times.length - 1]) {
      times.pop();
      forceLog.pop();
      var string = constraintLog.pop();
      system.constraints = JSON.parse(string);
      system.stringConstraint = string;
    }
    times.push(t);
    if (0 | !system.stringConstraint) {
      system.stringConstraint = JSON.stringify(system.constraints);
    }
    constraintLog.push(system.stringConstraint);
    forceLog.push(system.constraintForces);

    return dydt(system, y)[0];
  };

  var res = dopri(0, tfinal, y_0, fprime, 1e-6, 10000);
  var output = [];
  var t = 0;

  while (t < tfinal) {
    output.push(res.at(t));
    t += timestep;
  }
  return [output, [times, constraintLog], forceLog];
}

function dvdt(system) {
  var interactions = store.getMat(system.constraints.length, system.masses.length + 1)
  for (var constr = 0; constr < system.constraints.length; constr++){
    var constraint = system.constraints[constr];
    var row = interactions[constr];
    row[0] = 0;
    if (constraint.oneway === RELEASED) {
        continue
    }
    if (constraint.name === "Rod") {
       computeEffectRod(row, constraint, system);
    }
    if (constraint.name === "Slider") {
       computeEffectSlider(row,constraint, system);
    }
    if (constraint.name === "Colinear") {
       computeEffectColinear(row, constraint, system);
    }
    if (constraint.name === "F2k") {
       computeEffectF2k(row, constraint, system);
    }
    if (constraint.name === "Rope") {
       computeEffectRope(row, constraint, system);
    }
    if (constraint.name === "RopeDrum") {
       computeEffectRopeDrum(row, constraint, system);
    }
  }
  var interactions2 = sparseDotDivide(interactions, system.masses);
  interactions2 = multiplyTransposeSameSparsity(interactions2, interactions);
  for (var i = 0; i < interactions2.length; i++) {
	  if (interactions2[i][i] == 0) {
		  interactions2[i][i] = 1
	  }
  }
  var desires = store.getVec(system.constraints.length)
  for (var constr = 0; constr < system.constraints.length; constr++){
    var constraint = system.constraints[constr];
    if (constraint.name === "Rod") {
      desires[constr] = computeAccelerationRod(constraint, system);
    }
    if (constraint.name === "Slider") {
      desires[constr] = computeAccelerationSlider(constraint, system);
    }
    if (constraint.name === "Colinear") {
      desires[constr] = computeAccelerationColinear(constraint, system);
    }
    if (constraint.name === "F2k") {
      desires[constr] = computeAccelerationF2k(constraint, system);
    }
    if (constraint.name === "Rope") {
      desires[constr] = computeAccelerationRope(constraint, system);
    }
    if (constraint.name === "RopeDrum") {
      desires[constr] = computeAccelerationRopeDrum(constraint, system);
    }
  }
  let constraintForces = naiveSolve(interactions2, desires);
  system.constraintForces = constraintForces;
  for (var i = 0; i < constraintForces.length; i++) {
    system.constraints[i].force = constraintForces[i];
  }
  let acc = subtractv(
    dotDivide(
      multiplyBSparse([constraintForces], interactions),
      system.masses,
    )[0],
    system.forces,
  );
  for (var i = 0; i < constraintForces.length; i++) {
    if (constraintForces[i] > 0 && system.constraints[i].oneway === true) {
      system.constraints[i].oneway = RELEASED;
      system.stringConstraint = null;
      break;
    }
  }
  //var acc = new Array(system.positions.length).fill(0);
  return [acc, false];
}
function dydt(system, y) {
  system.positions = y.slice(0, system.positions.length);
  system.velocities = y.slice(system.positions.length, y.length);
  let [dv, _] = dvdt(system);
  if (system.terminate(y)) {
    var proj = window.data.projectile;
    for (var i = 0; i < system.constraints.length; i++) {
      if (
        system.constraints[i].p1 === proj ||
        system.constraints[i].p2 === proj ||
        system.constraints[i].p3 === proj
      ) {
        system.constraints.splice(i, 1);
        system.stringConstraint = null;
        break;
      }
    }
  }
  return [system.velocities.concat(dv), false];
}

function computeEffectRod(result, rod, system) {
  let direction = normalize(
    subtract(pget(system.positions, rod.p1), pget(system.positions, rod.p2)),
  );
  sparsepset(result, direction, rod.p2);
  sparsepset(result, [-direction[0], -direction[1]], rod.p1);
  return result;
}
function computeEffectSlider(result, slider, system) {
  sparsepset(result, slider.n, slider.p);
  return result;
}

function computeAccelerationRod(rod, system) {
  let r = subtract(
    pget(system.positions, rod.p1),
    pget(system.positions, rod.p2),
  );
  let v = subtract(
    pget(system.velocities, rod.p1),
    pget(system.velocities, rod.p2),
  );
  let l = Math.sqrt(r[0] * r[0] + r[1] * r[1]);

  return (v[0] * v[0] + v[1] * v[1]) / l;
}
function computeEffectRope(result, rope, system) {
  var positions = [];
  positions.push(rope.p1);
  for (var pulley of rope.p2) {
    positions.push(pulley.idx);
  }
  positions.push(rope.p3);

  for (var i = 1; i < positions.length - 1; i++) {
    if (
      rope.p2[i - 1].wrapping == "ccw_drop" ||
      rope.p2[i - 1].wrapping == "cw_drop"
    ) {
      // turn on pulleys as they drop onto the rope

      // check for dropping on based on the shape of the rope through the activated pulleys
      var pulley_before = i - 1;
      while (
        pulley_before > 0 &&
        (rope.p2[pulley_before - 1].wrapping == "ccw_drop" ||
          rope.p2[pulley_before - 1].wrapping == "cw_drop")
      ) {
        pulley_before -= 1;
      }
      var pulley_after = i + 1;
      while (
        pulley_after < positions.length - 2 &&
        (rope.p2[pulley_after - 1].wrapping == "ccw_drop" ||
          rope.p2[pulley_after - 1].wrapping == "cw_drop")
      ) {
        pulley_after += 1;
      }
      //
      var p1 = pget(system.positions, positions[pulley_before]);
      var p2 = pget(system.positions, positions[i]);
      var p3 = pget(system.positions, positions[pulley_after]);
      var wedge_ = wedge(subtract(p1, p2), subtract(p2, p3));

      if (
        (wedge_ > 0 && rope.p2[i - 1].wrapping == "ccw_drop") ||
        (wedge_ < 0 && rope.p2[i - 1].wrapping == "cw_drop")
      ) {
        rope.p2[i - 1].wrapping = "both";
        system.stringConstraint = null;
        break;
      }
    }
  }

  positions = [];
  positions.push(rope.p1);
  var index_in_p2 = 0;
  var indices_in_p2 = [-1];
  for (var pulley of rope.p2) {
    if (!(pulley.wrapping == "ccw_drop") && !(pulley.wrapping == "cw_drop")) {
      positions.push(pulley.idx);
      indices_in_p2.push(index_in_p2);
    }
    index_in_p2 += 1;
  }
  positions.push(rope.p3);
  for (var i = 1; i < positions.length - 1; i++) {
    var p1 = pget(system.positions, positions[i - 1]);
    var p2 = pget(system.positions, positions[i]);
    var p3 = pget(system.positions, positions[i + 1]);
    var wedge_ = wedge(subtract(p1, p2), subtract(p2, p3));
    if (
      (wedge_ > 0 && rope.p2[indices_in_p2[i]].wrapping == "ccw") ||
      (wedge_ < 0 && rope.p2[indices_in_p2[i]].wrapping == "cw")
    ) {
      rope.p2.splice(indices_in_p2[i], 1);
      system.stringConstraint = null;
      break;
    }
  }
  positions = [];
  positions.push(rope.p1);
  for (var pulley of rope.p2) {
    if (!(pulley.wrapping == "ccw_drop") && !(pulley.wrapping == "cw_drop")) {
      positions.push(pulley.idx);
    }
  }
  positions.push(rope.p3);
  result.fill(0)
  for (var i = 0; i < positions.length - 1; i++) {
    let p1 = positions[i];
    let p2 = positions[i + 1];

    let direction = normalize(
      subtract(pget(system.positions, p1), pget(system.positions, p2)),
    );
    let old = pget(result, p1 + .5);
    sparsepset(result, subtract(old, direction), p1);
    sparsepset(result, direction, p2);
  }
  return result;
}
function computeAccelerationRope(rope, system) {
  var sum = 0;
  var positions = [];
  positions.push(rope.p1);
  for (var pulley of rope.p2) {
    if (!(pulley.wrapping == "ccw_drop") && !(pulley.wrapping == "cw_drop")) {
      positions.push(pulley.idx);
    }
  }
  positions.push(rope.p3);
  for (var i = 0; i < positions.length - 1; i++) {
    let p1 = positions[i];
    let p2 = positions[i + 1];

    let r = subtract(pget(system.positions, p1), pget(system.positions, p2));
    let v = subtract(pget(system.velocities, p1), pget(system.velocities, p2));
    let l = Math.sqrt(r[0] * r[0] + r[1] * r[1]);
    sum += Math.pow(wedge(r, v), 2) / (l * l * l);
  }

  return sum;
}
function computeAccelerationSlider(slider, system) {
  var f = pget(system.forces, slider.p);
  return slider.n[0] * f[0] + slider.n[1] * f[1];
}

function computeEffectRopeDrum(result, ropedrum, system) {
  // Constraint: |p1 - p2| + |p2 - p3| - |p1 - p3| - L = 0
  // This models a rope from p1 wrapping around a drum (center p2, point p3 on circumference)

  let pos1 = pget(system.positions, ropedrum.p1);
  let pos2 = pget(system.positions, ropedrum.p2);
  let pos3 = pget(system.positions, ropedrum.p3);

  // Direction vectors
  let dir12 = subtract(pos1, pos2); // p1 - p2
  let dir23 = subtract(pos2, pos3); // p2 - p3
  let dir13 = subtract(pos1, pos3); // p1 - p3

  // Normalize
  let norm12 = normalize(dir12);
  let norm23 = normalize(dir23);
  let norm13 = normalize(dir13);

  // ∂C/∂p1 = (p1 - p2)/|p1 - p2| - (p1 - p3)/|p1 - p3|
  let grad1 = subtract(norm12, norm13);

  // ∂C/∂p2 = -(p1 - p2)/|p1 - p2| + (p2 - p3)/|p2 - p3|
  let grad2 = subtract(norm23, norm12);

  // ∂C/∂p3 = -(p2 - p3)/|p2 - p3| + (p1 - p3)/|p1 - p3|
  let grad3 = subtract(norm13, norm23);

  sparsepset(result, grad1, ropedrum.p1);
  sparsepset(result, grad2, ropedrum.p2);
  sparsepset(result, grad3, ropedrum.p3);

  return result;
}

function computeAccelerationRopeDrum(ropedrum, system) {
  // Second time derivative of constraint C = |p1 - p2| + |p2 - p3| - |p1 - p3|
  // Need to compute the centripetal acceleration terms for each segment

  let pos1 = pget(system.positions, ropedrum.p1);
  let pos2 = pget(system.positions, ropedrum.p2);
  let pos3 = pget(system.positions, ropedrum.p3);

  let vel1 = pget(system.velocities, ropedrum.p1);
  let vel2 = pget(system.velocities, ropedrum.p2);
  let vel3 = pget(system.velocities, ropedrum.p3);

  // For segment p1-p2
  let r12 = subtract(pos1, pos2);
  let v12 = subtract(vel1, vel2);
  let l12 = Math.sqrt(r12[0] * r12[0] + r12[1] * r12[1]);
  let radialVel12 = (r12[0] * v12[0] + r12[1] * v12[1]) / l12;
  let accel12 = radialVel12 * radialVel12 / l12;

  // For segment p2-p3
  let r23 = subtract(pos2, pos3);
  let v23 = subtract(vel2, vel3);
  let l23 = Math.sqrt(r23[0] * r23[0] + r23[1] * r23[1]);
  let radialVel23 = (r23[0] * v23[0] + r23[1] * v23[1]) / l23;
  let accel23 = radialVel23 * radialVel23 / l23;

  // For segment p1-p3
  let r13 = subtract(pos1, pos3);
  let v13 = subtract(vel1, vel3);
  let l13 = Math.sqrt(r13[0] * r13[0] + r13[1] * r13[1]);
  let radialVel13 = (r13[0] * v13[0] + r13[1] * v13[1]) / l13;
  let accel13 = radialVel13 * radialVel13 / l13;

  // Total acceleration = accel12 + accel23 - accel13
  return accel12 + accel23 - accel13;
}

function computeEffectColinear(result, colinear, system) {
  var [x, y] = pget(system.positions, colinear.slide);
  var [h, v] = pget(system.velocities, colinear.slide);

  var [xref, yref] = pget(system.positions, colinear.reference);
  var [href, vref] = pget(system.velocities, colinear.reference);

  var [xbase, ybase] = pget(system.positions, colinear.base);
  var [hbase, vbase] = pget(system.velocities, colinear.base);

  x = x - xbase;
  y = y - ybase;
  h = h - hbase;
  v = v - vbase;

  xref = xref - xbase;
  yref = yref - ybase;
  href = href - hbase;
  vref = vref - vbase;

  var denom = Math.sqrt(xref * xref + yref * yref);
  var denom3 = denom * denom * denom;

  var eX = -yref / denom;
  var eY = xref / denom;

  var eXref = (x * xref * yref + y * yref * yref) / denom3;
  var eYref = -(x * xref * xref + xref * y * yref) / denom3;

  var eXbase = -eX - eXref;
  var eYbase = -eY - eYref;

  sparsepset(result, [eX, eY], colinear.slide);
  sparsepset(result, [eXref, eYref], colinear.reference);
  sparsepset(result, [eXbase, eYbase], colinear.base);
  return result;
}
function computeAccelerationColinear(colinear, system) {
  var [x, y] = pget(system.positions, colinear.slide);
  var [h, v] = pget(system.velocities, colinear.slide);

  var [xref, yref] = pget(system.positions, colinear.reference);
  var [href, vref] = pget(system.velocities, colinear.reference);

  var [xbase, ybase] = pget(system.positions, colinear.base);
  var [hbase, vbase] = pget(system.velocities, colinear.base);

  x = x - xbase;
  y = y - ybase;
  h = h - hbase;
  v = v - vbase;

  xref = xref - xbase;
  yref = yref - ybase;
  href = href - hbase;
  vref = vref - vbase;

  var denom = Math.sqrt(xref * xref + yref * yref);

  var xrefh = xref / denom;
  var yrefh = yref / denom;

  var accel =
    (vref * xrefh - href * yrefh) *
    (((2 * href * x - vref * y) * xrefh * xrefh +
      (vref * x + href * y) * 3 * xrefh * yrefh +
      (2 * vref * y - href * x) * yrefh * yrefh) /
      (denom * denom) -
      (2 * (h * xrefh + v * yrefh)) / denom);

  return -accel;
}

function computeEffectF2k(result, f2k, system) {
  var [x, y] = pget(system.positions, f2k.slide);
  var [h, v] = pget(system.velocities, f2k.slide);

  var [xref, yref] = pget(system.positions, f2k.reference);
  var [href, vref] = pget(system.velocities, f2k.reference);

  var [xbase, ybase] = pget(system.positions, f2k.base);
  var [hbase, vbase] = pget(system.velocities, f2k.base);

  x = x - xbase;
  y = y - ybase;
  h = h - hbase;
  v = v - vbase;

  xref = xref - xbase;
  yref = yref - ybase;
  href = href - hbase;
  vref = vref - vbase;

  if (yref < 0) {
    if (!f2k.fatmode) {
      var baselength = x;
      var tiplength = xref - x;

      f2k.ratio = baselength / tiplength;
    }
    f2k.fatmode = true;
    system.stringConstraint = null;
  }
  if (f2k.fatmode) {
    sparsepset(result, [0, 1], f2k.base);
    sparsepset(result, [0, f2k.ratio], f2k.reference);
    return result;
  }

  var denom = Math.sqrt(xref * xref + yref * yref);
  var denom3 = denom * denom * denom;

  var eX = -yref / denom;
  var eY = xref / denom;

  var eXref = (x * xref * yref + y * yref * yref) / denom3;
  var eYref = -(x * xref * xref + xref * y * yref) / denom3;

  var eXbase = -eX - eXref;
  var eYbase = -eY - eYref;

  sparsepset(result, [eX, eY], f2k.slide);
  sparsepset(result, [eXref, eYref], f2k.reference);
  sparsepset(result, [eXbase, eYbase], f2k.base);
  return result;
}
function computeAccelerationF2k(f2k, system) {
  if (f2k.fatmode) {
    return -1 - f2k.ratio;
  }
  var [x, y] = pget(system.positions, f2k.slide);
  var [h, v] = pget(system.velocities, f2k.slide);

  var [xref, yref] = pget(system.positions, f2k.reference);
  var [href, vref] = pget(system.velocities, f2k.reference);

  var [xbase, ybase] = pget(system.positions, f2k.base);
  var [hbase, vbase] = pget(system.velocities, f2k.base);

  x = x - xbase;
  y = y - ybase;
  h = h - hbase;
  v = v - vbase;

  xref = xref - xbase;
  yref = yref - ybase;
  href = href - hbase;
  vref = vref - vbase;

  var denom = Math.sqrt(xref * xref + yref * yref);

  var accel =
    ((2 * href * x * xref * xref -
      2 * h * xref * xref * xref -
      vref * xref * xref * y +
      3 * vref * x * xref * yref -
      2 * v * xref * xref * yref +
      3 * href * xref * y * yref -
      href * x * yref * yref -
      2 * h * xref * yref * yref +
      2 * vref * y * yref * yref -
      2 * v * yref * yref * yref) *
      (vref * xref - href * yref)) /
    (denom * denom * denom * denom * denom);

  return -accel;
}
