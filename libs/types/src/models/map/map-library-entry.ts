import { User, Map } from '@momentum/types';
import { MapLibraryEntry as PrismaMapLibraryEntry } from '@prisma/client';

export interface MapLibraryEntry extends PrismaMapLibraryEntry {
  user?: User;
  map?: Map;
}
