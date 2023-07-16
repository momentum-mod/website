import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
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
import { DbService } from './app/modules/database/db.service';
import { Environment } from '@momentum/backend/config';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { FastifyReply } from 'fastify';

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
      rawBody: true // So we can use RawBodyRequest
    }
  );

  const configService = app.get(ConfigService);
  const env: Environment = configService.get('env');

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
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      forbidUnknownValues: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Prefix everything by auth with /api
  app.setGlobalPrefix('api', { exclude: ['auth(.*)'] });

  // All routes (besides auth, which uses VERSION_NEUTRAL) are version 1 by
  // default, versions can be incremented on a per-route basis upon future
  // versions
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v'
  });

  // In dev, serve a script to the client to handle redirecting after auth.
  // Usually we'd let Nest handle routing, but doing a separate controller file
  // would be silly, especially since this is developer-only.
  if (env !== Environment.PRODUCTION) {
    // Since TS 5 / Nest 10 this `any` cast has been necessary. May be possible
    // to remove once `@nestjs/platform-fastify` is on latest `fastify`.
    const fastify = app.getHttpAdapter().getInstance() as any as FastifyAdapter;
    fastify.get('/', (_, reply: FastifyReply) => reply.redirect('/dashboard'));
    fastify.get('/dashboard', (_, reply: FastifyReply) =>
      reply
        .type('text/html')
        .send("<script>window.location.port = '4200';</script>")
    );
  }

  // Enable @fastify/helmet header protections
  await app.register(helmet, {
    global: true,
    // Needed for ugly above redirect script to work.
    contentSecurityPolicy: env === Environment.PRODUCTION
  });

  // We use a pretty strict CORS policy, so register these headers
  // In production this allows https://momentum-mod.org to communicate with
  // https://api.momentum-mod.org/
  await app.register(cors, {
    origin:
      env === Environment.PRODUCTION
        ? this.config.get('url')
        : 'http://localhost:4200',
    allowedHeaders: [
      'Origin',
      'Access-Control-Allow-Origin',
      'X-Requested-With',
      'Accept',
      'Content-Type',
      'Authorization'
    ],
    exposedHeaders: 'Location',
    methods: ['GET', 'PUT', 'OPTIONS', 'POST', 'DELETE', 'PATCH']
  });

  // Cookies for transferring JWTs back to client after OpenID auth
  await app.register(cookie, { secret: configService.get('sessionSecret') });

  // Hooks to ensure Nest and Prisma both shut down cleanly on exit
  // https://docs.nestjs.com/recipes/prisma#issues-with-enableshutdownhooks
  const prismaDalc: DbService = app.get(DbService);
  await prismaDalc.enableShutdownHooks(app);

  // Swagger stuff
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Momentum Mod API')
    .setDescription(
      'The Momentum Mod API - https://github.com/momentum-mod/website'
    )
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

bootstrap().then();
