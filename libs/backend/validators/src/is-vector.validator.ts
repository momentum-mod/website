import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from 'class-validator';

export function IsVector(
  property: unknown,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isVector',
      target: object.constructor,
      constraints: [property],
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown, args: ValidationArguments) =>
          Array.isArray(value) &&
          value.length === args.constraints[0] &&
          value.every((x) => typeof x === 'number'),

        defaultMessage(args: ValidationArguments) {
          return `${propertyName} must be an number array of length ${args.constraints[0]}`;
        }
      }
    });
  };
}
