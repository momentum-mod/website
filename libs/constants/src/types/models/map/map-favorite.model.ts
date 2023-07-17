import { User } from '../user/user.model';
import { Map } from './map.model';

import { MapFavorite as PrismaMapFavorite } from '@prisma/client';

export interface MapFavorite extends PrismaMapFavorite {
  map?: Map;
  user?: User;
}
