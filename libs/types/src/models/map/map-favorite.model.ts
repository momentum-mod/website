import { User, Map } from '@momentum/types';
import { MapFavorite as PrismaMapFavorite } from '@prisma/client';

export interface MapFavorite extends PrismaMapFavorite {
  map?: Map;
  user?: User;
}
