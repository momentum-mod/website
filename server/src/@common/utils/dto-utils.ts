import { Transform } from 'class-transformer';

/**
 * Factory method for constructing DTOs from Prisma objects easily
 * @param type - The DTO type to transform into
 * @param input - The input data
 * @param nullReturnsEmptyObject - Don't attempt construction if input is empty. Used by some DTOs where we want to return an empty object rather than 404
 */
export const DtoFactory = <T>(
    type: { new (): T },
    input: Record<string, unknown>,
    nullReturnsEmptyObject = false
): T => {
    if (!input) return nullReturnsEmptyObject ? ({} as T) : undefined;
    else {
        const dto = new type();
        for (const key in input) {
            if (key && key in dto && dto[key] === undefined) {
                dto[key] = input[key];
            }
        }
        return dto;
    }
};

/**
 * Simple class-transformer based decorator for constructing nested DTOs during DTO construction
 * @param type - The DTO type to transform into
 */
export const DtoTransform = <T>(type: new () => T): PropertyDecorator =>
    Transform(({ value }) => DtoFactory(type, value));

/**
 * Simple class-transformer based decorator for constructing nested DTO arrays during DTO construction
 * @param type - The DTO type to transform into
 */
export const DtoArrayTransform = <T>(type: new () => T): PropertyDecorator =>
    Transform(({ value }) => value?.map((x) => x && DtoFactory(type, x)));

/**
 * Transform comma-separared DB expansion strings
 */
export const TransformExpansion = (): PropertyDecorator => Transform(({ value }) => value.split(','));
