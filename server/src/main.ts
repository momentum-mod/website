import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaRepo } from './modules/prisma/prisma.repo';
import { AppModule } from './app.module';
import { appConfig } from '../config/config';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
    const app: NestExpressApplication = await NestFactory.create(AppModule, {
        bodyParser: false
    });

    bigIntFix();
    await setPrismaSettings(app);
    enableGlobalNestElements(app);

    // bootstrap that is only needed for prod build and not needed for tests
    exposePublicAssets(app);
    enableSwagger(app);

    await app.listen(appConfig.port);
}

export function bigIntFix(){
    // MDN recommended hack override for BigInt
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
    // https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006088574
    BigInt.prototype['toJSON'] = function () {
        return this.toString();
    };
}

export function exposePublicAssets(app: any) {
    app.useStaticAssets(join(__dirname, '..', 'public/assets'));
    return app;
}

export function enableSwagger(app: any) {
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
}    
    
export async function setPrismaSettings(app: any) {
    const prismaDalc: PrismaRepo = app.get(PrismaRepo);
    await prismaDalc.enableShutdownHooks(app);
    return app;
}

export function enableGlobalNestElements(app: any){    
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    return app;
}

bootstrap();
