import { repl } from '@nestjs/core';
import { AppModule } from './app/app.module';

/**
 * Run this file via `npm run start:repl` launch the API in REPL (Read-Eval-Print-Loop) mode,
 * enabling you to interact with running providers via the command line.
 *
 * See https://docs.nestjs.com/recipes/repl for more info.
 *
 * Note: Currently FastifyMulterModule fails to launch in this configuration. For now, just
 * comment out the import in app.module.ts temporaily to use this.
 */
(async () => await repl(AppModule))();
