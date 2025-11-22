function computeAccelerationRopeDrum(ropedrum, system) {
  let pos1 = pget(system.positions, ropedrum.p1);
  let pos2 = pget(system.positions, ropedrum.p2);
  let pos3 = pget(system.positions, ropedrum.p3);

  let vel1 = pget(system.velocities, ropedrum.p1);
  let vel2 = pget(system.velocities, ropedrum.p2);
  let vel3 = pget(system.velocities, ropedrum.p3);

  let r = ropedrum.radius;

  // Extract coordinates (matching SymPy variable names)
  let x1 = pos1[0], y1 = pos1[1];
  let x2 = pos2[0], y2 = pos2[1];
  let x3 = pos3[0], y3 = pos3[1];
  let vx1 = vel1[0], vy1 = vel1[1];
  let vx2 = vel2[0], vy2 = vel2[1];
  let vx3 = vel3[0], vy3 = vel3[1];

  // Exact SymPy-derived acceleration formula
  // d²C/dt² at t=0 (no manual simplification!)
  let acceleration = r*((1/2)*Math.pow(r, 3)*(-(2*vx1 - 2*vx2)*(x1 - x2) - (2*vy1 - 2*vy2)*(y1 - y2))*(-1/2*(2*vx1 - 2*vx2)*(x1 - x2) - 1/2*(2*vy1 - 2*vy2)*(y1 - y2))/(Math.pow(-Math.pow(r, 2)/(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) + 1, 3/2)*Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 7/2)) + r*(-1/2*(vx1 - vx2)*(2*vx1 - 2*vx2) - 1/2*(vy1 - vy2)*(2*vy1 - 2*vy2))/(Math.sqrt(-Math.pow(r, 2)/(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) + 1)*Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 3/2)) + r*(-3/2*(2*vx1 - 2*vx2)*(x1 - x2) - 3/2*(2*vy1 - 2*vy2)*(y1 - y2))*(-1/2*(2*vx1 - 2*vx2)*(x1 - x2) - 1/2*(2*vy1 - 2*vy2)*(y1 - y2))/(Math.sqrt(-Math.pow(r, 2)/(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) + 1)*Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 5/2)) - (vx1 - vx2)*(-vy1 + vy2)/(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) - (vx1 - vx2)*(vy1 - vy2)/(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) - (vx1 - vx2)*(-y1 + y2)*(-(2*vx1 - 2*vx2)*(x1 - x2) - (2*vy1 - 2*vy2)*(y1 - y2))/Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 2) + (-vx2 + vx3)*(-vy2 + vy3)/(Math.pow(-x2 + x3, 2) + Math.pow(-y2 + y3, 2)) + (-vx2 + vx3)*(vy2 - vy3)/(Math.pow(-x2 + x3, 2) + Math.pow(-y2 + y3, 2)) + (-vx2 + vx3)*(y2 - y3)*(-(-2*vx2 + 2*vx3)*(-x2 + x3) - (-2*vy2 + 2*vy3)*(-y2 + y3))/Math.pow(Math.pow(-x2 + x3, 2) + Math.pow(-y2 + y3, 2), 2) - (vy1 - vy2)*(x1 - x2)*(-(2*vx1 - 2*vx2)*(x1 - x2) - (2*vy1 - 2*vy2)*(y1 - y2))/Math.pow(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 2) + (-vy2 + vy3)*(-x2 + x3)*(-(-2*vx2 + 2*vx3)*(-x2 + x3) - (-2*vy2 + 2*vy3)*(-y2 + y3))/Math.pow(Math.pow(-x2 + x3, 2) + Math.pow(-y2 + y3, 2), 2)) + ((1/2)*(vx1 - vx2)*(2*vx1 - 2*vx2) + (1/2)*(vy1 - vy2)*(2*vy1 - 2*vy2))/Math.sqrt(-Math.pow(r, 2) + Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)) + (-1/2*(2*vx1 - 2*vx2)*(x1 - x2) - 1/2*(2*vy1 - 2*vy2)*(y1 - y2))*((1/2)*(2*vx1 - 2*vx2)*(x1 - x2) + (1/2)*(2*vy1 - 2*vy2)*(y1 - y2))/Math.pow(-Math.pow(r, 2) + Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2), 3/2);

  return acceleration;
}
