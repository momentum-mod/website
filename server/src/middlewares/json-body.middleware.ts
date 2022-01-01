import { Request, Response } from 'express';
import * as bodyParser from 'body-parser';
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class JsonBodyMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: () => any) {
        bodyParser.json()(req, res, next);
    }
}
