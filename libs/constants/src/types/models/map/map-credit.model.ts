import { MapCreditType } from '../../../enums/map-credit-type.enum';
import { MapCredit as PrismaMapCredit } from '@prisma/client';
import { MMap } from './map.model';
import { User } from '../user/user.model';

export interface MapCredit extends PrismaMapCredit {
  type: MapCreditType;
  user?: User;
  map?: MMap;
}

export type CreateMapCredit = Pick<MapCredit, 'userID' | 'type'>;

export interface UpdateMapCredit {
  userID: number;
  type: number;
}
