import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsBigInt(validationOptions?: ValidationOptions) {
    return function (object: unknown, propertyName: string) {
        registerDecorator({
            name: 'isBigInt',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate: (value: any) => typeof value === 'bigint',
                defaultMessage() {
                    return `${propertyName} must be a BigInt.`;
                }
            }
        });
    };
}
