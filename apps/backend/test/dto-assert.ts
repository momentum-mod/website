import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import * as assert from 'node:assert/strict';

export function assertValidDto(data: unknown, type: any): void {
  const instance = plainToInstance(type, { ...(data as object) });
  const errors = validateSync(instance as object, {
    forbidUnknownValues: false
  });
  assert.strictEqual(errors.length, 0, JSON.stringify(errors));
}
