import { registerDecorator, ValidationOptions } from 'class-validator';
import { MAP_NAME_REGEXP } from '@momentum/constants';

export function IsMapName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMapName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          // Don't allow map names to start with a number. It lets us determine
          // when some value is a ID or a name (useful), and no current maps
          // start with a name (practically all current maps start with a
          // gamemode prefix)
          return typeof value === 'string' && MAP_NAME_REGEXP.test(value);
        },

        defaultMessage() {
          return `${propertyName} is not a valid map name. It should contain only alphanumeric characters and the _ and - characters`;
        }
      }
    });
  };
}
