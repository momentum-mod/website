// Starts a stateless postgres server with pglite and runs a provided command
const { spawn } = require('child_process');
const { startPrismaDevServer } = require('@prisma/dev');

(async () => {
  if (process.argv.length < 3) {
    console.log('Usage: with-pg-lite <command>');
    return;
  }
  console.log('Starting prisma dev server...');
  const server = await startPrismaDevServer({ persistenceMode: 'stateless' });

  const child = spawn(process.argv.slice(2).join(' '), {
    env: {
      ...process.env,
      DATABASE_URL: server.ppg.url
    },
    shell: true
  });

  process.once('SIGTERM', () => {
    child.kill('SIGTERM');
  });

  process.once('SIGINT', () => {
    child.kill('SIGINT');
  });

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on('exit', async (code) => {
    await server.close();
    process.exit(code);
  });
})();
