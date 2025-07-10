import { registerDecorator, ValidationOptions } from 'class-validator';
import { ISOCountryCode } from '@momentum/constants';

export function IsCountryCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCountryCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return (
            typeof value === 'string' &&
            Object.keys(ISOCountryCode).includes(value)
          );
        },

        defaultMessage() {
          return `${propertyName} must be a valid ISO31661 Alpha2 code`;
        }
      }
    });
  };
}
