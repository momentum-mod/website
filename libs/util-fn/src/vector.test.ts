import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Vector, Vector2D } from '@momentum/constants';
import { Vec } from './vector';

describe('Vec', () => {
  it('Vec.add should add two 3D vectors correctly', () => {
    const v1: Vector = [1, 2, 3];
    const v2: Vector = [4, 5, 6];
    const result = Vec.add(v1, v2);
    assert.deepEqual(result, [5, 7, 9]);
  });

  it('Vec.add should add two 2D vectors correctly', () => {
    const v1: Vector2D = [1, 2];
    const v2: Vector2D = [3, 4];
    const result = Vec.add(v1, v2);
    assert.deepEqual(result, [4, 6]);
  });

  it('Vec.sub should subtract two 3D vectors correctly', () => {
    const v1: Vector = [1, 2, 3];
    const v2: Vector = [4, 5, 6];
    const result = Vec.sub(v1, v2);
    assert.deepEqual(result, [-3, -3, -3]);
  });

  it('Vec.sub should subtract two 2D vectors correctly', () => {
    const v1: Vector2D = [1, 2];
    const v2: Vector2D = [3, 4];
    const result = Vec.sub(v1, v2);
    assert.deepEqual(result, [-2, -2]);
  });

  it('Vec.len should calculate the length of a 3D vector correctly', () => {
    const vec: Vector = [1, 2, 2];
    const result = Vec.len(vec);
    assert.equal(result, 3);
  });

  it('Vec.len should calculate the length of a 2D vector correctly', () => {
    const vec: Vector2D = [3, 4];
    const result = Vec.len(vec);
    assert.equal(result, 5);
  });

  it('Vec.dot should calculate the dot product of two 3D vectors correctly', () => {
    const v1: Vector = [1, 2, 3];
    const v2: Vector = [4, 5, 6];
    const result = Vec.dot(v1, v2);
    assert.equal(result, 32);
  });

  it('Vec.dot should calculate the dot product of two 2D vectors correctly', () => {
    const v1: Vector2D = [1, 2];
    const v2: Vector2D = [3, 4];
    const result = Vec.dot(v1, v2);
    assert.equal(result, 11);
  });

  it('should return -1 for counter-clockwise orientation', () => {
    const result = Vec.ccw([0, 0], [0, 1], [1, 0]);
    assert.equal(result, -1);
  });

  it('should return 1 for clockwise orientation', () => {
    const result = Vec.ccw([0, 0], [1, 0], [0, 1]);
    assert.equal(result, 1);
  });

  it('should return 0 for colinear points', () => {
    const result = Vec.ccw([0, 0], [1, 1], [2, 2]);
    assert.equal(result, 0);
  });
});
