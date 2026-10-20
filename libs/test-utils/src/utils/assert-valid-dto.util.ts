import * as assert from 'node:assert/strict';
import { Type } from '@nestjs/common';
import { ValidationError, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PagedResponseDto } from '../../../../apps/backend/src/app/dto/paged-response.dto';

export function assertValidDto(received: unknown, type: Type): void {
  const errors = validate(type, received);

  if (errors.length > 0) {
    const plural = errors.length > 1;
    assert.fail(
      `expected DTO data ${JSON.stringify(received)} to validate ${
        type.name
      }. It threw th${plural ? 'ese' : 'is'} error${plural ? 's' : ''}` +
        formatValidationErrors(errors)
    );
  }
}

export function assertValidPagedDto(
  received: PagedResponseDto<unknown>,
  type: Type,
  returnCount?: number,
  totalCount?: number
): void {
  if (
    !received ||
    !Object.hasOwn(received, 'data') ||
    !Array.isArray(received.data)
  ) {
    assert.fail('expected paged DTO with response array, data was invalid');
  }

  if (received.data.length === 0 && received.returnCount !== 0) {
    assert.fail(
      'expected paged DTO with populated response array, array was empty'
    );
  }

  if (
    typeof returnCount === 'number' &&
    !Number.isNaN(returnCount) &&
    received.returnCount !== returnCount
  ) {
    assert.fail(
      `expected returnCount of ${returnCount}, got ${received.returnCount}`
    );
  }

  if (
    typeof totalCount === 'number' &&
    !Number.isNaN(totalCount) &&
    received.totalCount !== totalCount
  ) {
    assert.fail(
      `expected totalCount of ${totalCount}, got ${received.totalCount}`
    );
  }

  const totalErrors: [unknown, ValidationError[]][] = [];

  for (const item of received.data) {
    const errors = validate(type, item);

    if (errors.length > 0) {
      totalErrors.push([item, errors]);
    }
  }

  if (totalErrors.length > 0) {
    const plural = totalErrors.length > 1;
    assert.fail(
      `expected paged DTO to contain valid DTOs of type ${type.name}. Th${
        plural ? 'ese' : 'is'
      } item${plural ? 's' : ''} errored:\n\t` +
        totalErrors
          .map(
            ([item, errors]) =>
              `${JSON.stringify(
                item
              )}\nerrored with: ${formatValidationErrors(errors)}`
          )
          .join('\n\n')
    );
  }
}

function validate(type: Type, data: unknown): ValidationError[] {
  const instance = plainToInstance(type, { ...(data as object) });
  return validateSync(instance, { forbidUnknownValues: false });
}

function formatValidationErrors(errors: ValidationError[], depth = 1): string {
  return errors
    .map((error) => {
      const newLine = '\n' + '\t'.repeat(depth);
      let errorString =
        newLine +
        'Property: ' +
        error.property +
        newLine +
        'Value: ' +
        JSON.stringify(error.value);
      if (error.constraints)
        errorString +=
          newLine +
          'Constraints: ' +
          Object.entries(error.constraints ?? {})
            .map(([conName, conMessage]) => `${conName}: ${conMessage}`)
            .join(newLine + '  ');
      if (error.children?.length > 0)
        errorString +=
          newLine +
          'Children:' +
          formatValidationErrors(error.children, depth + 1);

      return errorString;
    })
    .join('\n');
}
