import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaService } from './modules/repo/prisma.service';
import { AppModule } from './app.module';
import { appConfig } from '../config/config';
import { ClassSerializerInterceptor, NestApplicationOptions, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    // MDN recommended hack override for BigInt
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    // https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006088574
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const options: NestApplicationOptions = {
        bodyParser: false,
        rawBody: true // Used to access raw body from Steam ingame auth
    };

    const app: NestExpressApplication = await NestFactory.create(AppModule, options);

    app.useStaticAssets(join(__dirname, '..', 'public/assets'));

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

    await app.listen(appConfig.port);
}

// noinspection JSIgnoredPromiseFromCall
bootstrap();
