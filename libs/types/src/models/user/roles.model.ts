import { Roles as PrismaRoles } from '@prisma/client';

export interface Roles extends PrismaRoles {}

export interface UpdateRoles extends Partial<Omit<Roles, 'userID'>> {}
