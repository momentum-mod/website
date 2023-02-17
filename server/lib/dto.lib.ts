import { plainToInstance, Transform, Type as TypeDecorator } from 'class-transformer';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiPropertyOptions } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsPositive, IsBoolean, ValidateNested } from 'class-validator';

/**
 * Factory method for constructing DTOs from objects (often from Prisma) easily.
 * 
 * class-transformer handles the heavy lifting.
 * 
 * @param type - The DTO type to transform into
 * @param input - The input data
 */
export function DtoFactory<T>(type: Type<T>, input: Record<string, unknown>): T | undefined {
    // Ignore decorators here, we don't seem to need them. They get applied when the class instance is converted
    // back to JSON by the ClassSerializerInterceptor.
    return plainToInstance(type, input, { ignoreDecorators: true });
}

/**
 * Utility type to allow implementations of Prisma models to treat their `bigint` properties as `number`s.
 *
 * Excludes properties with key TExclude.
 *
 * Combined with below NumberifyBigInt transformer to ensure we handle them safely.
 */
export type PrismaModelToDto<TModel extends Record<string, any>, TExclude extends string | void = void> = {
    [K in keyof TModel]: TModel[K] extends bigint
        ? K extends TExclude
            ? bigint
            : number
        : TModel[K] extends object
        ? PrismaModelToDto<TModel[K], TExclude>
        : TModel[K];
};

/**
 * Transform an array of expansion strings into Prisma includes e.g. { foo: true, bar: true, ... }
 * @param expansions - String array of all the allowed expansions
 * */
export function ExpandToPrismaIncludes(expansions: string[]): Record<string, boolean> | undefined {
    if (!expansions || !Array.isArray(expansions)) return undefined;

    const includes: Record<string, boolean> = {};
    for (const expansion of expansions) includes[expansion] = true;
    return includes;
}

/**
 * Well, kind of safe. This is an annoying transform we do to ensure that we can use 64-bit ints with Prisma but numbers
 * in JSON, rather than a string (currently we have handle BigInts as string, since class-transformer doesn't give us a
 * way to use something like safe-stable-stringify).
 * 
 * Used for the various table IDs that use int64s that can conceivable be > 2^32, but not 2^53.
 */
export const SafeBigIntToNumber = () =>
    Transform(
        ({ value }) => {
            const numberified = Number.parseInt(value);
            if (numberified > Number.MAX_SAFE_INTEGER)
                throw new InternalServerErrorException(
                    'Tried to convert a BigInt to a number that exceeded MAX_SAFE_INTEGER!'
                );
            return numberified;
        },
        { toPlainOnly: true }
    );

function conditionalDecorators(...args: [boolean, () => PropertyDecorator | undefined][]): PropertyDecorator[] {
    return args.map(([condition, decorator]) => (condition ? decorator() : () => void 0));
}

function conditionalDecorator(condition: boolean, decorator: () => PropertyDecorator): PropertyDecorator {
    return condition ? decorator() : () => void 0;
}

// NOTE: It may be possible to use reflection to get the types of all the below funcs but I've messed with it for hours
// and can't figure it out, leaving for now.
/**
 * Decorator combo for
 *  - ApiProperty
 *  - IsPositive/IsPositiveNumberString
 *  - Optional-ness
 *  - BigInt handling: If the ID is a BigInt it will be transformed to a Number assuming it's of a valid size.
 *
 * Required by default!
 */
export function IdProperty(options?: { bigint?: boolean } & Omit<ApiPropertyOptions, 'type'>): PropertyDecorator {
    const required = options?.required ?? true;
    const bigint = options?.bigint ?? false;
    return applyDecorators(
        ApiProperty({ type: Number, ...omit(options, ['bigint']), required: required }),
        IsInt,
        IsPositive(),
        ...conditionalDecorators([bigint, SafeBigIntToNumber], [!required, IsOptional])
    );
}
