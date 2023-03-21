import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class HTTPLoggerMiddleware implements NestMiddleware {
    private logger = new Logger('HTTP');

    use(request: FastifyRequest['raw'], response: FastifyReply['raw'], next: () => void): void {
        const {
            method,
            url,
            connection: { remoteAddress: ip },
            headers: { ['user-agent']: userAgent }
        } = request;

        response.on('finish', () => {
            const { statusCode } = response;

            this.logger.log(`${method} ${url} ${statusCode} - ${userAgent} ${ip}`);
        });

        next();
    }
}
