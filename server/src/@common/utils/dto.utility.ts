import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

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

export type QueryExpansion = Record<string, boolean>;

/**
 * Transform comma-separared DB expansion strings into <string, bool> record for Prisma, and set Swagger properties
 * @param expansions - String array of all the allowed expansions
 */
export const QueryExpansionHandler = (expansions: string[]): PropertyDecorator =>
    applyDecorators(
        ApiPropertyOptional({
            name: 'expand',
            type: String,
            enum: expansions,
            description: `Expands, comma-separated (${expansions.join(', ')}))`
        }),
        IsOptional,
        Transform(({ value }) => {
            const vals = value.split(',');
            return expansions.reduce((expansion, item) => {
                return { ...expansion, [item]: vals.includes(item) };
            }, {}) as QueryExpansion;
        })
    );
