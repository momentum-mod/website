import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaRepo } from './modules/prisma/prisma.repo';
import { AppModule } from './app.module';
import { appConfig } from '../config/config';
import { NestApplicationOptions } from '@nestjs/common';
import { join } from 'path';

async function bootstrap() {
    // MDN recommended hack override for BigInt
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    // https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006088574
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };

    const options: NestApplicationOptions = {
        bodyParser: false
    };

    const app: NestExpressApplication = await NestFactory.create(AppModule, options);

    app.useStaticAssets(join(__dirname, '..', 'public/assets'));

    const config = new DocumentBuilder()
        .setTitle('Momentum Mod API')
        .setDescription('The Momentum Mod API - Made with 💖')
        .addBearerAuth()
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
        customSiteTitle: 'Momentum Mod API Docs',
        customfavIcon: '../favicon.ico'
    });

    const prismaDalc: PrismaRepo = app.get(PrismaRepo);
    prismaDalc.enableShutdownHooks(app);

    await app.listen(appConfig.port);
}
bootstrap();
