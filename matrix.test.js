import { expect, test } from "vitest";
import {
  naiveMultiply,
  multiplyTransposeSameSparsity,
  naiveSolve,
} from "./matrix.js";

test("funky sparse matrix routine", () => {
  expect(1).toBe(1);

  var symmetricA = [
    [4, 5, 0, 3],
    [5, 0, 0, 2],
    [0, 0, 9, 3],
    [3, 2, 3, 0],
  ];

  // Convert to sparse format: [bitvector, val_at_bit0, val_at_bit1, val_at_bit2, val_at_bit3]
  var sparseA = [
    [11, 4, 5, 0, 3],  // bits 0,1,3 set: values [4,5,0,3]
    [9, 5, 0, 0, 2],   // bits 0,3 set: values [5,0,0,2]
    [12, 0, 0, 9, 3],  // bits 2,3 set: values [0,0,9,3]
    [7, 3, 2, 3, 0],   // bits 0,1,2 set: values [3,2,3,0]
  ];

  var out1 = naiveMultiply(symmetricA, symmetricA);
  var out2 = multiplyTransposeSameSparsity(sparseA, sparseA);

  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 4; j++) {
      expect(out1[i][j]).toBe(out2[i][j]);
    }
  }
});

test("matrix inversion", () => {
  var A = [
    [4, 5, 0, 3],
    [5, 0, 3, 2],
    [2, 0, 9, 3],
    [3, 2, 3, 0],
  ];
  var y = [[1], [2], [3], [4]];

  var x = naiveMultiply(A, y);

  y = y.flat();
  x = x.flat();

  var yhat = naiveSolve(A, x);
  for (var j = 0; j < 4; j++) {
    expect(y[j]).toBeCloseTo(yhat[j]);
  }
});
