export const DtoUtils = {
    Factory<Type>(t: { new (): Type }, input: Record<string, unknown>, nullReturnsEmptyObject = false): Type {
        if (!input) {
            if (nullReturnsEmptyObject) return {} as Type;
            return;
        }

        const dto: Type = new t();
﻿import { Transform } from 'class-transformer';

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
