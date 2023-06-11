import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions
} from 'class-validator';

export function IsEnumFlag(
  property: unknown,
  validationOptions?: ValidationOptions
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFlagEnum',
      target: object.constructor,
      constraints: [property],
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [enumObject] = args.constraints;
          const relatedValue = (args.object as Record<string, unknown>)[
            propertyName
          ] as number;
          // A valid flag will be less than 2 ^ numflags - 1.
          // Typescript generates reverse mappings [https://www.typescriptlang.org/docs/handbook/enums.html#reverse-mappings]
          // for numeric enums, so we divide the size of it by 2, this runs a
          // lot so best to do it fastest way.
          return (
            Number.isInteger(relatedValue) &&
            relatedValue < 1 << (Object.keys(enumObject).length / 2)
          );
        },

        defaultMessage() {
          return `${propertyName} is not a valid enum flag.`;
        }
      }
    });
  };
}
