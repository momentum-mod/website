import { MapCredit as PrismaMapCredit } from '@prisma/client';
import { MapCreditType } from '../../../enums/map-credit-type.enum';
import { User } from '../user/user.model';
import { MMap } from './map.model';

export interface MapCredit extends PrismaMapCredit {
  type: MapCreditType;
  user?: User;
  map?: MMap;
}

export type CreateMapCredit = Pick<MapCredit, 'type' | 'description'>;
