import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaService } from '@modules/repo/prisma.service';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
    // Transforms `BigInt`s to strings in JSON.stringify, for cases that haven't been explicitly
    // transformed to numbers using @NumberifyBigInt().
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
        rawBody: true // So we can use RawBodyRequest
    });
    app.useStaticAssets({ root: join(__dirname, 'assets/') });

    // Forbidding unknown values here ensures any request containing unexpected data on the query/body (i.e. does not
    // have validators) will fail. Our tests even more strict: passing an unexpected value will throw an error.
    // In effect, you MUST include validation decorators.
    app.useGlobalPipes(new ValidationPipe({ transform: true, forbidUnknownValues: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });

    const prismaDalc: PrismaService = app.get(PrismaService);
    await prismaDalc.enableShutdownHooks(app);

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Momentum Mod API')
        .setDescription('The Momentum Mod API - https://github.com/momentum-mod/website')
        .addBearerAuth()
        .setVersion('1.0')
        .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    await SwaggerModule.setup('api-docs', app, swaggerDocument, {
        customSiteTitle: 'Momentum Mod API Docs',
        customfavIcon: '../favicon.ico',
        swaggerOptions: {
            persistAuthorization: true
        }
    });

    const configService = app.get(ConfigService);
    const port = configService.get('port');

    await app.listen(port);
}

bootstrap();
