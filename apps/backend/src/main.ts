import './instrumentation'; // This must be first import!!
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { Logger } from 'nestjs-pino';
import { Environment } from './app/config';
import { AppModule } from './app/app.module';
import { VALIDATION_PIPE_CONFIG } from './app/dto';

async function bootstrap() {
  // Transforms `BigInt`s to strings in JSON.stringify, for cases that haven't
  // been explicitly transformed to numbers using @NumberifyBigInt() https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
  BigInt.prototype['toJSON'] = function () {
    return this.toString();
  };

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true, // Buffer logs until Pino is attached
      rawBody: true // So we can use RawBodyRequest
    }
  );

  // Use Pino as our logger
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const env: Environment = configService.getOrThrow('env');

  // Steam game auth and replay submission from game send raw octet-streams.
  // Steam auth we could limit to 2kb, but replays can be massive. Limiting
  // to 100mb for now, we should *really* switch out SteamHTTP to less shit
  // C++ HTTP handler that allows multipart/form-data requests, which would give
  // use much more fine-grained control over file uploads from the game.
  app.useBodyParser('application/octet-stream', { bodyLimit: 1e8 });

  // Forbidding unknown values here ensures any request containing unexpected
  // data on the query/body (i.e. does not have validators) will fail. Our tests
  // even more strict: passing an unexpected value will throw an error. In
  // effect, you MUST include validation decorators
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_CONFIG));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // All routes (besides auth, which uses VERSION_NEUTRAL) are version 1 by
  // default, versions can be incremented on a per-route basis upon future
  // versions
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v'
  });

  // Enable @fastify/helmet header protections
  await app.register(helmet, { global: true });

  // CORS policy to allow browsers to access the backend from dashboard.momentum-mod.org
  await app.register(cors, {
    origin:
      env === Environment.PRODUCTION
        ? configService.getOrThrow('url.frontend')
        : 'http://localhost:4200',
    allowedHeaders: [
      'Origin',
      'Access-Control-Allow-Origin',
      'X-Requested-With',
      'Accept',
      'Content-Type',
      'Authorization'
    ],
    methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'DELETE', 'PATCH']
  });

  // Cookies for transferring JWTs back to client after OpenID auth
  await app.register(cookie, {
    secret: configService.getOrThrow('sessionSecret')
  });

  app.enableShutdownHooks();

  // Swagger stuff
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Momentum Mod API')
        .setDescription(
          'The Momentum Mod API - https://github.com/momentum-mod/website'
        )
        .addBearerAuth()
        .setVersion('1.0')
        .build()
    ),
    {
      customSiteTitle: 'Momentum Mod API Docs',
      customfavIcon: 'https://momentum-mod.org/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true
      }
    }
  );

  // Here we fucking go!!!
  await app.listen(
    configService.getOrThrow('port'),
    env === Environment.PRODUCTION ? '0.0.0.0' : 'localhost',
    (error: Error | null, _address: string) => {
      if (error) {
        app.get(Logger).error(error.message);
      }
    }
  );
}

void bootstrap();
