import { Transform, Type } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

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
 * Decorator collection for skip queries
 * @param def - The default skip value
 */
export const SkipQueryDecorators = (def: number): PropertyDecorator =>
    applyDecorators(
        ApiPropertyOptional({
            name: 'skip',
            type: Number,
            default: def,
            description: 'Skip this many records'
        }),
        IsOptional(),
        Type(() => Number),
        IsInt()
    );

/**
 * Decorator collection for take queries
 * @param def - The default skip value
 */
export const TakeQueryDecorators = (def: number): PropertyDecorator =>
    applyDecorators(
        ApiPropertyOptional({
            name: 'take',
            type: Number,
            default: def,
            description: 'Take this many records'
        }),
        IsOptional(),
        Type(() => Number),
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
export const ExpandToPrismaIncludes = (expansions: string[]): Record<string, boolean> | undefined =>
    expansions
        ? (expansions.reduce((expansion, item) => {
              expansion[item] = true;
              return expansion;
          }, {}) as Record<string, boolean>)
        : undefined;
