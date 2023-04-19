import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsSteamCommunityID(validationOptions?: ValidationOptions) {
  return function (object: unknown, propertyName: string) {
    registerDecorator({
      name: 'isSteamCommunityID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^\d{1,20}$/.test(value);
        },

        defaultMessage() {
          return `${propertyName} must be a string representing a uint64`;
        }
      }
    });
  };
}
