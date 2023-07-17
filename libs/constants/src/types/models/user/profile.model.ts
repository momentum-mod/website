import { Profile as PrismaProfile } from '@prisma/client';
import { Socials } from './socials.model';

export interface Profile extends Omit<PrismaProfile, 'socials'> {
  socials: Socials;
}
