import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaService } from '@modules/repo/prisma.service';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    // MDN recommended hack override for BigInt
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    // https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006088574
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const options: NestApplicationOptions = {
        // Disable bodyParser - we handle body parsing middlewares explicitly.
        bodyParser: false
    };

    const app: NestExpressApplication = await NestFactory.create(AppModule, options);

    app.useStaticAssets(join(__dirname, 'assets/'));

    const config = new DocumentBuilder()
        .setTitle('Momentum Mod API')
        .setDescription('The Momentum Mod API - https://github.com/momentum-mod/website')
        .addBearerAuth()
        .setVersion('1.0')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
        customSiteTitle: 'Momentum Mod API Docs',
        customfavIcon: '../favicon.ico'
    });

    const prismaDalc: PrismaService = app.get(PrismaService);
    await prismaDalc.enableShutdownHooks(app);

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

    const configService = app.get(ConfigService);
    const port = configService.get('port');

    await app.listen(port);
}

// TODO: Decide if we should move to ES modules and if so can use top level await here.
// eslint-disable-next-line unicorn/prefer-top-level-await
bootstrap();
