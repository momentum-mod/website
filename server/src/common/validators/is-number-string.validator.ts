import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsNumberString(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'isNumberString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          try {
            return typeof value === 'string' && BigInt(value) >= 0;
          } catch {
            return false;
          }
        },

        defaultMessage() {
          return `${propertyName} must be a string representing a number`;
        }
      }
    });
  };
}
