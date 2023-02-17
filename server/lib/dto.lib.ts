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
 *  - @ApiProperty
 *  - @Type
 *  - @ValidateNested
 *  - @IsOptional if options.required = true
 *
 *  Optional by default!
 *
 *  If options.lazy, use a lazy function to avoid circular dependencies (for when DTOs reference each other)
 */
export function NestedProperty<T>(
    type: Type<T>,
    options: { lazy?: boolean } & Omit<ApiPropertyOptions, 'type'> = {}
): PropertyDecorator {
    const required = options?.required ?? false;
    return applyDecorators(
        ApiProperty({ ...options, type: options?.lazy ? () => type : type, required: required }),
        TypeDecorator(() => type), // Note we rename the import, this is just class-transformer's @Type.
        ValidateNested(),
        conditionalDecorator(!required, IsOptional)
    );
}

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

/**
 * Decorator combo for numeric enums using
 *  - ApiProperty with nice Swagger type type/enum handling
 *  - Type handling for queries
 *  - IsEnum
 *
 *  Required by default!
 * @param {Type} type - Enum type
 * @param {ApiPropertyOptions} options - Options to pass to Swagger, minus `type` and `enum` (`type` arg handles this).
 *                                       Also uses `required` to determine use of `@IsOptional()`
 */
export function EnumProperty(
    type: { [key: number]: string },
    options: Omit<ApiPropertyOptions, 'type' | 'enum'> = {}
): PropertyDecorator {
    const required = options?.required ?? true;
    return applyDecorators(
        ApiProperty({
            type: Number,
            enum: type,
            ...options,
            required: required
        }),
        TypeDecorator(() => Number),
        IsEnum(type),
        conditionalDecorator(!required, IsOptional)
    );
}

/**
 * Decorator combo for
 *  - ApiProperty (with generic description)
 *  - IsDateString
 */
export function CreatedAtProperty(): PropertyDecorator {
    return applyDecorators(
        ApiProperty({ type: String, description: 'When the item was first created, as ISO8601 date string' }),
        IsDateString()
    );
}

/**
 * Decorator combo for
 *  - ApiProperty (with generic description)
 *  - IsDateString
 */
export function UpdatedAtProperty(): PropertyDecorator {
    return applyDecorators(
        ApiProperty({ type: String, description: 'When the item was last modified, as ISO8601 date string' }),
        IsDateString()
    );
}

/**
 * Decorator collection for skip queries
 * @param def - The default skip value
 */
export function SkipQueryProperty(def: number): PropertyDecorator {
    return applyDecorators(
        ApiPropertyOptional({
            name: 'skip',
            type: Number,
            default: def,
            description: 'Skip this many records'
        }),
        TypeDecorator(() => Number),
        IsInt(),
        IsOptional()
    );
}

/**
 * Decorator collection for take queries
 * @param def - The default take value
 */
export function TakeQueryProperty(def: number): PropertyDecorator {
    return applyDecorators(
        ApiPropertyOptional({
            name: 'take',
            type: Number,
            default: def,
            description: 'Take this many records'
        }),
        TypeDecorator(() => Number),
        IsPositive(),
        IsOptional()
    );
}

/**
 * Transform comma-separared DB expansion strings into <string, bool> record for Prisma, and set Swagger properties
 *
 * @param expansions - String array of all the allowed expansions
 */
export function ExpandQueryProperty(expansions: string[]): PropertyDecorator {
    return applyDecorators(
        ApiPropertyOptional({
            name: 'expand',
            type: String,
            enum: expansions,
            description: `Expands, comma-separated (${expansions.join(', ')}))`
        }),
        Transform(({ value }) => value.split(',').filter((exp) => expansions.includes(exp))),
        IsArray(),
        IsOptional()
    );
}

/**
 * Transforms boolean queries.
 *
 * Optional by default!
 *
 * If `foo` is defined and is the string "true" (i.e. `?foo=true`), transforms to `true`, else `false`.
 * */
export function BooleanQueryProperty(options?: Omit<ApiPropertyOptions, 'type'>) {
    const required = options?.required ?? false;
    return applyDecorators(
        ApiProperty({ ...options, type: Boolean, required: required }),
        Transform(({ value }) => {
            if (value && typeof value == 'string') return value === 'true';
            return;
        }),
        IsBoolean(),
        conditionalDecorator(!required, IsOptional)
    );
}

/**
 * Transforms integer queries.
 *
 * Optional by default!
 * */
export function IntQueryProperty(options?: Omit<ApiPropertyOptions, 'type'>) {
    const required = options?.required ?? false;
    return applyDecorators(
        ApiProperty({ type: Number, required: required }),
        // Even if this is a BigInt to Prisma, we treat it as a Number in service logic handling incoming data; all
        // Prisma args for a stored BigInt take `bigint | number`.
        TypeDecorator(() => Number),
        conditionalDecorator(!required, IsOptional)
    );
}

/**
 * Handles strings queries.
 *
 * Optional by default!
 * */
export function StringQueryProperty(options?: Omit<ApiPropertyOptions, 'type'>) {
    const required = options?.required ?? false;
    return applyDecorators(
        ApiProperty({ ...options, type: String, required: required }),
        IsString(),
        conditionalDecorator(!required, IsOptional)
    );
}

/**
 * Transform string CSV queries.
 *
 * Optional by default!
 * */
export function StringCsvQueryProperty(options?: Omit<ApiPropertyOptions, 'type'>) {
    const required = options?.required ?? false;
    return applyDecorators(
        ApiProperty({
            ...options,
            type: String,
            required: required,
            description: '[CSV list of strings]' + options?.description ? ' ' + options.description : ''
        }),
        Transform(({ value }) => value.split(',')),
        IsArray(),
        conditionalDecorator(!required, IsOptional)
    );
}

/**
 * Transform integer CSV queries.
 *
 * Optional by default!
 * */
export function IntCsvQueryProperty(options?: Omit<ApiPropertyOptions, 'type'>) {
    const required = options?.required ?? false;
    return applyDecorators(
        ApiProperty({
            ...options,
            type: String,
            required: required,
            description: '[CSV list of integers]' + options?.description ? ' ' + options.description : ''
        }),
        Transform(({ value }) => value.split(',').map((v) => Number.parseInt(v))),
        IsArray(),
        conditionalDecorator(!required, IsOptional)
    );
}

/**
 * Handles enum queries
 *
 * Optional by default!
 * */
export function EnumQueryProperty(
    type: { [key: number]: string },
    options: Omit<ApiPropertyOptions, 'type' | 'enum'> = {}
) {
    const opts = { required: false, ...options };
    return EnumProperty(type, opts);
}
