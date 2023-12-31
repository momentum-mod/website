import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsPositiveNumberString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveNumberString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          try {
            return typeof value === 'string' && BigInt(value) > 0;
          } catch {
            return false;
          }
        },

        defaultMessage() {
          return `${propertyName} must be a string representing a positive number`;
        }
      }
    });
  };
}
