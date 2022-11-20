import { plainToInstance, Transform, Type as TypeDecorator } from 'class-transformer';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger';
import { IsInt, IsOptional, ValidateNested } from 'class-validator';

/**
 * Factory method for constructing DTOs from objects (often from Prisma) easily.
 * class-transformer handles the heavy lifting.
 * @param type - The DTO type to transform into
 * @param input - The input data
 * @param nullReturnsEmptyObject - Don't attempt construction if input is empty. Used by some DTOs where we want to
 *  return an empty object rather than 404
 */
export const DtoFactory = <T>(
    type: { new (): T },
    input: Record<string, unknown>,
    nullReturnsEmptyObject = false
): T => {
    if (!input) {
        if (nullReturnsEmptyObject) return {} as T;
        return undefined;
    }
    return plainToInstance(type, input);
};

/**
 * Combination of the @ApiProperty, @Type, and @ValidateNested decorators. Handles nested transformation and validation.
 * @param {Type} type - The DTO type to transform the nested data into, and document in Swagger.
 * @param {ApiPropertyOptions} swaggerOptions - Options to pass to Swagger, minus `type` and `required`.
 */
// It may be possible to use reflection to get the type but I've messed with it for hours and can't figure
// it out, leaving for now.
export function NestedDto<T>(type: Type<T>, swaggerOptions: ApiPropertyOptions = {}): PropertyDecorator {
    return applyDecorators(
        ApiProperty({ ...swaggerOptions }),
        TypeDecorator(() => type), // Note we rename the import, this is just class-transformer's @Type.
        ValidateNested
    );
}

/**
 * Combination of the @ApiPropertyOptional, @Type, @ValidateNested and @IsOptional decorators. Handles nested
 * transformation and validation.
 * @param {Type} type - The DTO type to transform the nested data into, and document in Swagger.
 * @param {ApiPropertyOptions} swaggerOptions - Options to pass to Swagger, minus `type` and `required`.
 */
export function NestedDtoOptional<T>(type: Type<T>, swaggerOptions: ApiPropertyOptions = {}): PropertyDecorator {
    return applyDecorators(
        ApiPropertyOptional({ ...swaggerOptions }),
        TypeDecorator(() => type),
        ValidateNested,
        IsOptional
    );
}

export function SkipQuery(def: number): PropertyDecorator {
    return applyDecorators(
        ApiPropertyOptional({
            name: 'skip',
            type: Number,
            default: def,
            description: 'Skip this many records'
        }),
        IsOptional(),
        TypeDecorator(() => Number),
        IsInt()
    );
}

/**
 * Decorator collection for take queries
 * @param def - The default skip value
 */
export const TakeQuery = (def: number): PropertyDecorator =>
    applyDecorators(
        ApiPropertyOptional({
            name: 'take',
            type: Number,
            default: def,
            description: 'Take this many records'
        }),
        IsOptional(),
        TypeDecorator(() => Number),
        IsInt()
    );

/**
 * Transform comma-separared DB expansion strings into <string, bool> record for Prisma, and set Swagger properties
 * @param expansions - String array of all the allowed expansions
 */
export const ExpandQueryDecorators = (expansions: string[]): PropertyDecorator =>
    applyDecorators(
        ApiPropertyOptional({
            name: 'expand',
            type: String,
            enum: expansions,
            description: `Expands, comma-separated (${expansions.join(', ')}))`
        }),
        IsOptional,
        Transform(({ value }) => value.split(',').filter((exp) => expansions.includes(exp)))
    );

/**
 * Transform an array of expansion strings into Prisma includes e.g. { foo: true, bar: true, ... }
 * @param expansions - String array of all the allowed expansions
 * */
export const ExpandToPrismaIncludes = (expansions: string[]): Record<string, boolean> | undefined => {
    if (!expansions || !Array.isArray(expansions)) return undefined;

    const includes: Record<string, boolean> = {};
    for (const expansion of expansions) includes[expansion] = true;
    return includes;
};
