import { MapCredit as PrismaMapCredit } from '@prisma/client';
import { MapCreditType } from '../../../enums/map-credit-type.enum';
import { User } from '../user/user.model';
import { MMap } from './map.model';

export interface MapCredit extends Omit<PrismaMapCredit, 'description'> {
  type: MapCreditType;
  description?: string;
  user?: User;
  map?: MMap;
}

export type CreateMapCredit = Pick<
  MapCredit,
  'userID' | 'type' | 'description'
>;
