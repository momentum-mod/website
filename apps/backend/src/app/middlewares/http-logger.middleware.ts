import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class HTTPLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(
    request: FastifyRequest['raw'],
    response: FastifyReply['raw'],
    next: () => void
  ): void {
    const {
      method,
      socket: { remoteAddress: ip },
      headers: { ['user-agent']: userAgent }
    } = request;

    // request.url only contains params (e.g. '/?expand=info'  not the full URL
    // path. Hack to access the full path (e.g. '/api/v1/maps?expand=info'
    const url = (request as any).originalUrl;

    response.on('finish', () => {
      const { statusCode } = response;

      this.logger.log(`${method} ${url} ${statusCode} - ${userAgent} ${ip}`);
    });

    next();
  }
}
