import { MapLibraryEntry as PrismaMapLibraryEntry } from '@prisma/client';
import { User } from '../user/user.model';
import { MMap } from './map.model';

export interface MapLibraryEntry extends PrismaMapLibraryEntry {
  user?: User;
  map?: MMap;
}
