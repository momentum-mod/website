import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaService } from '@modules/repo/prisma.service';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import helmet from '@fastify/helmet';

async function bootstrap() {
    // Transforms `BigInt`s to strings in JSON.stringify, for cases that haven't been explicitly
    // transformed to numbers using @NumberifyBigInt()
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
        rawBody: true // So we can use RawBodyRequest
    });

    const configService = app.get(ConfigService);

    // Steam game auth sends a raw octet-stream, only use-case. Limit to 2kb
    app.useBodyParser('application/octet-stream', { bodyLimit: 2e3 });

    // Just for Swagger assets
    app.useStaticAssets({ root: join(__dirname, 'assets/') });

    // Forbidding unknown values here ensures any request containing unexpected data on the query/body (i.e. does not
    // have validators) will fail. Our tests even more strict: passing an unexpected value will throw an error.
    // In effect, you MUST include validation decorators
    app.useGlobalPipes(new ValidationPipe({ transform: true, forbidUnknownValues: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    // Prefix everything by auth with /apid
    app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });

    // All routes (besides auth, which uses VERSION_NEUTRAL) are version 1 by default,
    // versions can be incremented on a per-route basis upon future versions
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'v' });

    // Enable @fastify/helmet header protections
    await app.register(helmet, { global: true });

    await app.register(fastifyCookie, { secret: configService.get('sessionSecret') });

    // Hooks to ensure Nest and Prisma both shut down cleanly on exit
    // https://docs.nestjs.com/recipes/prisma#issues-with-enableshutdownhooks
    const prismaDalc: PrismaService = app.get(PrismaService);
    await prismaDalc.enableShutdownHooks(app);

    // Swagger stuff
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Momentum Mod API')
        .setDescription('The Momentum Mod API - https://github.com/momentum-mod/website')
        .addBearerAuth()
        .setVersion('1.0')
        .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, swaggerDocument, {
        customSiteTitle: 'Momentum Mod API Docs',
        customfavIcon: 'https://momentum-mod.org/favicon.ico',
        swaggerOptions: {
            persistAuthorization: true
        }
    });

    // Here we fucking go!!!
    await app.listen(configService.get('port'));
}

bootstrap();
