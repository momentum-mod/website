import 'dotenv/config';
import type { PrismaConfig } from 'prisma';
import { env } from 'prisma/config';

export default {
  schema: './schema.prisma',
  migrations: {
    path: './migrations'
  },
  datasource: {
    url: env('DATABASE_URL')
  },
  typedSql: {
    path: './sql'
  }
} satisfies PrismaConfig;
