import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaRepo } from './repositories/prisma.repo';
import { AppModule } from './app.module';
import { appConfig } from '../config/config';
import * as passport from 'passport';
import * as steam from 'passport-steam';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Momentum Mod API')
    .setDescription('The Momentum Mod API - Made with 💖')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const prismaDalc: PrismaRepo = app.get(PrismaRepo);
  prismaDalc.enableShutdownHooks(app)

  passport.use(new steam.Strategy({
    returnURL: appConfig.baseURL_Auth + '/api/v1/auth/steam/return',
    realm: appConfig.baseURL_Auth,
    apiKey: appConfig.steam.webAPIKey
  }, (openID, profile, done) => {
    console.log(openID);
    console.log(profile);
    console.log(done);
  }));

  app.use(passport.initialize());

  await app.listen(appConfig.port);
} 
bootstrap();
