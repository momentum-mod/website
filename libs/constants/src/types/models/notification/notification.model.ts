import { Notification as PrismaNotification } from '@prisma/client';
import { User } from '../user/user.model';
import { PastRun } from '../run/past-run.model';
import { MMap } from '../map/map.model';

export interface Notification extends PrismaNotification {
  targetUser: User;
  user?: User;
  map?: MMap;
  run?: PastRun;
}
