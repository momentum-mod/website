import { MapCreditType } from '@momentum/constants';
import { MapCredit as PrismaMapCredit } from '@prisma/client';
import { User, Map } from '@momentum/types';

export interface MapCredit extends PrismaMapCredit {
  type: MapCreditType;
  user?: User;
  map?: Map;
}

export interface CreateMapCredit
  extends Pick<MapCredit, 'userID' | 'type'> {}

export interface UpdateMapCredit {
  userID: number;
  type: number;
}
