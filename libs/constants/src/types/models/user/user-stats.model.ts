import { UserStats as PrismaUserStats } from '@prisma/client';

export type UserStats = Omit<PrismaUserStats, 'cosXP'> & {
  // TODO: TYPE HACK
  // This is needed since both frontend and backend use this variable,
  // and on backend it's a bigint, on frontend it's a number (class-transformer
  // transforms it). It's a fucking terrible system that I need to do better,
  // but I need to kill class-transformer first.
  cosXP: number | bigint;
};
