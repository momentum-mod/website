import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaService } from '@modules/repo/prisma.service';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';

export const appOptions: NestApplicationOptions = {
    // Disable bodyParser - we handle body parsing middlewares explicitly.
    bodyParser: false
};

async function bootstrap() {
    // MDN recommended hack override for BigInt
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    // https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006088574
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const app: NestExpressApplication = await NestFactory.create(AppModule, appOptions);
    app.useStaticAssets(join(__dirname, 'assets/'));

    // Forbidding unknown values here ensures any request containing unexpected data on the query/body (i.e. does not
    // have validators) will fail. Our tests even more strict: passing an unexpected value will throw an error.
    // In effect, you MUST include validation decorators.
    app.useGlobalPipes(new ValidationPipe({ transform: true, forbidUnknownValues: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    app.setGlobalPrefix('api', { exclude: ['auth'] });

    const prismaDalc: PrismaService = app.get(PrismaService);
    await prismaDalc.enableShutdownHooks(app);

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Momentum Mod API')
        .setDescription('The Momentum Mod API - https://github.com/momentum-mod/website')
        .addBearerAuth()
        .setVersion('1.0')
        .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, swaggerDocument, {
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

// TODO: Decide if we should move to ES modules and if so can use top level await here.
// eslint-disable-next-line unicorn/prefer-top-level-await
bootstrap();
