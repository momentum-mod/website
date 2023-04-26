import { BadRequestException, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

/**
 * Factory method for constructing DTOs from objects (often from Prisma) easily.
 *
 * class-transformer handles the heavy lifting.
 *
 * @param type - The DTO type to transform into
 * @param input - The input data
 */
export function DtoFactory<T>(
  type: Type<T>,
  input: Record<string, unknown>
): T | undefined {
  // Ignore decorators here, we don't seem to need them. They get applied when the class instance is converted
  // back to JSON by the ClassSerializerInterceptor.
  return plainToInstance(type, input, { ignoreDecorators: true });
}

/**
 * Transform an array of expansion strings into Prisma includes e.g. { foo: true, bar: true, ... }
 * @param expansions - String array of all the allowed expansions
 * */
export function ExpandToPrismaIncludes(
  expansions: string[]
): Record<string, boolean> | undefined {
  if (!expansions || !Array.isArray(expansions)) return undefined;

  const includes: Record<string, boolean> = {};
  for (const expansion of expansions) includes[expansion] = true;
  return includes;
}

/**
 * Return 400 whenever a request body is empty
 */
export function checkNotEmpty(body: object): void {
  if (Object.keys(body).length === 0)
    throw new BadRequestException('Empty request body');
}
