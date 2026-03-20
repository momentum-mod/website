import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

@Injectable()
export class UserIPThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: FastifyRequest): Promise<string> {
    const ip = req.ips.length > 0 ? req.ips[0] : req.ip;
    const uid = req.user?.id ?? -1;

    return `${uid}@${ip}`;
  }
}
