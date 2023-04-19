import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsMapName(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'isMapName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^[\w-]+$/.test(value);
        },

        defaultMessage() {
          return `${propertyName} is not a valid map name. It should contain only alphanumeric characters and the _ and - characters`;
        }
      }
    });
  };
}
