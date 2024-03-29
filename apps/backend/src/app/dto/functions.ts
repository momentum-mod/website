import { Type } from '@nestjs/common';
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
  // Ignore decorators here, we don't seem to need them. They get applied when
  // the class instance is converted back to JSON by the
  // ClassSerializerInterceptor.
  return plainToInstance(type, input, { ignoreDecorators: true });
}
