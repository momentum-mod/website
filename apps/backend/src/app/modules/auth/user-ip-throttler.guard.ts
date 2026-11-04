import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class UserIPThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Only HTTP requests are rate limited. Nest 12 also runs global guards on
    // gateway handlers, which Nest 11 (and this app) never throttled.
    if (context.getType() !== 'http') return true;
    return super.canActivate(context);
  }

  protected async getTracker(req: FastifyRequest): Promise<string> {
    const ip = req.ips.length > 0 ? req.ips[0] : req.ip;
    const uid = req.user?.id ?? -1;

    return `${uid}@${ip}`;
  }
}
