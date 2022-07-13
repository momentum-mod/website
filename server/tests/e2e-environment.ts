import NodeEnvironment from 'jest-environment-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/modules/repo/prisma.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { Reflector } from '@nestjs/core';

export default class E2ETestEnvironment extends NodeEnvironment {
    constructor(config, context) {
        super(config, context);
    }

    async setup() {
        await super.setup();

        const moduleRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        BigInt.prototype['toJSON'] = function () {
            return this.toString();
        };

        const app = moduleRef.createNestApplication();

        app.useGlobalPipes(new ValidationPipe({ transform: true, enableDebugMessages: true }));
        app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

        await app.init();

        this.global.server = app.getHttpServer();
        this.global.prisma = app.get(PrismaService);
        this.global.auth = app.get(AuthService);
    }

    async teardown() {
        await super.teardown();
    }
}
