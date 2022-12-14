import { Injectable, NestMiddleware } from '@nestjs/common';
import express, { Request, Response } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: () => any) {
        express.raw({ type: '*/*' })(req, res, next);
    }
}
