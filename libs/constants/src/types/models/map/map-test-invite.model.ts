import { MapTestInvite as PrismaMapTestInvite } from '@prisma/client';
import { User } from '../user/user.model';
import { MapTestInviteState } from '../../../enums/map-test-invite-state.enum';

export interface MapTestInvite extends PrismaMapTestInvite {
  user?: User;
  state: MapTestInviteState;
}

export interface CreateMapTestInvite {
  userIDs: number[];
}

export interface UpdateMapTestInvite {
  accept: boolean;
}
