import { Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VALIDATION_PIPE_CONFIG } from './validation-pipe-config';

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

/**
 * Validate a game WebSocket message body against a DTO class, returning either
 * the transformed DTO or an error to send back as the response.
 *
 * Nest doesn't apply global pipes to gateways, and an exception thrown by a
 * gateway pipe only reaches `client.emit('exception')`, which on a raw `ws`
 * socket is a local event rather than a message to the client. Handlers
 * therefore validate explicitly.
 */
export async function validateWsBody<T extends object>(
  type: Type<T>,
  body: unknown
): Promise<{ data: T } | { error: string }> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Invalid message body' };
  }

  const data = plainToInstance(type, body);
  const errors = await validate(data, VALIDATION_PIPE_CONFIG);
  if (errors.length > 0) {
    return {
      error: errors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .join(', ')
    };
  }

  return { data };
}
