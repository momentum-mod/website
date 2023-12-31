import { MapFavorite as PrismaMapFavorite } from '@prisma/client';
import { User } from '../user/user.model';
import { MMap } from './map.model';

export interface MapFavorite extends PrismaMapFavorite {
  map?: MMap;
  user?: User;
}
