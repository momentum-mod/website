import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPastDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          const isoDate = new Date(value as string);
          if (Number.isNaN(isoDate.getTime())) {
            return false;
          }

          return isoDate < new Date();
        },

        defaultMessage() {
          return `${propertyName} must be before the current date.`;
        }
      }
    });
  };
}
