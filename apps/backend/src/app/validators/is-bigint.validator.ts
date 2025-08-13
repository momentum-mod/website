import { registerDecorator, ValidationOptions } from 'class-validator';

const MAX_INT64 = BigInt(2 ** 63);
const MIN_INT64 = -BigInt(2 ** 63);

export function IsBigInt(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBigInt',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'bigint' && value < MAX_INT64 && value >= MIN_INT64,
        defaultMessage() {
          return `${propertyName} must be a BigInt.`;
        }
      }
    });
  };
}
