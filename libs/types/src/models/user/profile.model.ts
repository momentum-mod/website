import { Profile as PrismaProfile } from '@prisma/client';
import { Socials } from '@momentum/constants';

export interface Profile extends Omit<PrismaProfile, 'socials'> {
  socials: Socials;
}
