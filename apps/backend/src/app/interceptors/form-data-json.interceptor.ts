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
    try {
      if (Array.isArray(this.keys)) {
        for (const k of this.keys) {
          request.body[k] = JSON.parse(request.body[k]);
        }
      } else {
        request.body[this.keys] = JSON.parse(request.body[this.keys]);
      }
    } catch (error) {
      throw new BadRequestException(error.message);
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
