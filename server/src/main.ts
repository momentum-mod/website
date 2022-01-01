import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaRepo } from './repositories/prisma.repo';
import { AppModule } from './app.module';
import { appConfig } from '../config/config';

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

  await app.listen(appConfig.port);
} 
bootstrap();
