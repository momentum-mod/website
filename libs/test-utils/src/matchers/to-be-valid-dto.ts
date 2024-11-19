import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { PagedResponseDto } from '../../../../apps/backend/src/app/dto/paged-response.dto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    // eslint-disable-next-line @typescript-eslint/naming-convention,unused-imports/no-unused-vars
    interface Matchers<R> {
      toBeValidDto: (type: any) => CustomMatcherResult;
      toBeValidPagedDto: (
        type: any,
        returnCount?: number,
        totalCount?: number
      ) => CustomMatcherResult;
    }
  }
}

export function toBeValidDto(received, type) {
  const errors = validate(type, received);

  const pass = errors.length === 0;

  if (pass) {
    return {
      message: () => `expected DTO data not to validate the ${type.name} DTO`,
      pass: true
    };
  } else {
    const plural = errors.length > 1;
    return {
      message: () =>
        `expected DTO data ${JSON.stringify(received)} to validate ${
          type.name
        }. It threw th${plural ? 'ese' : 'is'} error${plural ? 's' : ''}` +
        formatValidationErrors(errors),
      pass: false
    };
  }
}

export function toBeValidPagedDto(
  received: PagedResponseDto<any>,
  type,
  returnCount?: number,
  totalCount?: number
) {
  if (
    !received ||
    !Object.hasOwn(received, 'data') ||
    !Array.isArray(received.data)
  )
    return {
      message: () => 'expected paged DTO with response array, data was invalid',
      pass: false
    };

  if (received.data.length === 0 && received.returnCount !== 0)
    return {
      message: () =>
        'expected paged DTO with populated response array, array was empty',
      pass: false
    };

  if (
    returnCount &&
    typeof returnCount === 'number' &&
    received.returnCount !== returnCount
  )
    return {
      message: () =>
        `expected returnCount of ${returnCount}, got ${received.returnCount}`,
      pass: false
    };

  if (
    totalCount &&
    typeof totalCount === 'number' &&
    received.totalCount !== totalCount
  )
    return {
      message: () =>
        `expected totalCount of ${totalCount}, got ${received.totalCount}`,
      pass: false
    };

  const totalErrors: [any, ValidationError[]][] = [];

  for (const item of received.data) {
    const errors = validate(type, item);

    if (errors.length > 0) {
      totalErrors.push([item, errors]);
    }
  }

  const pass = totalErrors.length === 0;

  if (pass)
    return {
      message: () =>
        `expected at least one paged DTO data not to validate the ${type.name} DTO`,
      pass: true
    };
  else {
    const plural = totalErrors.length > 1;
    return {
      message: () =>
        `expected paged DTO to contain valid DTOs of type ${type.name}. Th${
          plural ? 'ese' : 'is'
        } item${plural ? 's' : ''} errored:\n\t` +
        totalErrors
          .map(
            (error) =>
              `${JSON.stringify(
                error[0]
              )}\nerrored with: ${formatValidationErrors(error[1])}`
          )
          .join('\n\n'),
      pass: false
    };
  }
}

function validate(type, data): ValidationError[] {
  // Use class-transformer to create an instance of the DTO type with the
  // passed in data
  const instance = plainToInstance(type, { ...data });

  // class-validator errors here for "undefined" properties for some bizarre
  // reason. We're getting rid of class-validator eventually anyway. TODO: We
  // should test better that `excludeExtraneousValues: true` is really being
  // applied properly, otherwise we could potentially expose a value we don't
  // want to.
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
