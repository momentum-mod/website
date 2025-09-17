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
import multipart from '@fastify/multipart';
import { Logger } from 'nestjs-pino';
import cluster from 'node:cluster';
import { Environment } from './app/config';
import { AppModule } from './app/app.module';
import { VALIDATION_PIPE_CONFIG } from './app/dto';
import { FIRST_WORKER_ENV_VAR } from './clustered';

/* eslint no-console: 0 */
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

  await app.register(multipart);

  // CORS policy to allow browsers to access the backend from dashboard.momentum-mod.org
  await app.register(cors, {
    origin:
      env === Environment.PRODUCTION
        ? configService.getOrThrow<string>('url.frontend')
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
    secret: configService.getOrThrow<string>('sessionSecret')
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

// Single-process mode. Current process does everything.
function startSingle(): void {
  console.log('Starting in single-process mode');
  process.env[FIRST_WORKER_ENV_VAR] = 'true';
  bootstrap().catch((error) => console.error(error));
}

// Clustered mode. Forks multiple processes that share the same port, and
// primary process handles distributing incoming requests via round-robin.
// See https://nodejs.org/api/cluster.html#how-it-works for more details.
function startClustered(): void {
  if (cluster.isPrimary) {
    console.log(`Primary process ${process.pid} started`);

    for (let i = 0; i < numProcesses; i++) {
      cluster.fork({
        [FIRST_WORKER_ENV_VAR]: i === 0 ? 'true' : 'false'
      });
    }

    cluster.on('exit', (worker, code, signal) => {
      // Worker processees should never be allowed to exit, if one does we
      // all do and let Docker restart.
      console.error(
        `worker ${worker.process.pid} died (code: ${code}, signal: ${signal}), exiting...`
      );
      process.exit(1);
    });
  } else {
    bootstrap().catch((error) => console.error(error));
    console.log(`Worker process ${process.pid} started`);
  }
}

const numProcesses = Number(process.env.NEST_CLUSTER_NUM_PROCESSES ?? '0');
if (Number.isNaN(numProcesses) || numProcesses <= 1) {
  startSingle();
} else {
  startClustered();
}

process.on('uncaughtException', (err) => {
  console.error(new Date().toUTCString() + ' uncaughtException:', err.message);
  console.error(err.stack);
  process.exit(1);
});
