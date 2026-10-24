import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';

class FormDataJsonInterceptorClass implements NestInterceptor {
  constructor(private readonly keys: string | string[]) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const body = request.body as Record<string, any> | undefined;
    try {
      if (body) {
        if (Array.isArray(this.keys)) {
          for (const k of this.keys) {
            body[k] = JSON.parse(body[k]);
          }
        } else {
          body[this.keys] = JSON.parse(body[this.keys]);
        }
      }
    } catch (error: any) {
      throw new BadRequestException(error?.message ?? String(error));
    }

    return next.handle();
  }
}

/**
 * Interceptor that will replace the givens key(s) on the request with their
 * values parsed as JSON.
 *
 * @param keys - Keys on the request to parse
 */
export function FormDataJsonInterceptor(keys: string | string[]) {
  return new FormDataJsonInterceptorClass(keys);
}
