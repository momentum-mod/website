import { User } from '../user/user.model';
import { MMap } from './map.model';

import { MapFavorite as PrismaMapFavorite } from '@prisma/client';

export interface MapFavorite extends PrismaMapFavorite {
  map?: MMap;
  user?: User;
}
