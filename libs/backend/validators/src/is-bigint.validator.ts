import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsBigintValidator(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBigInt',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => typeof value === 'bigint',
        defaultMessage() {
          return `${propertyName} must be a BigInt.`;
        }
      }
    });
  };
}
