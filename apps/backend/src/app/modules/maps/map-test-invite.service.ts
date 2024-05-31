import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  MapStatus,
  MapTestInviteState,
  NotificationType
} from '@momentum/constants';
import { difference } from '@momentum/util-fn';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MapTestInviteService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly notifsService: NotificationsService
  ) {}

  async updateTestInvites(mapID: number, requestIDs: number[], userID: number) {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    if (map.submitterID !== userID) {
      throw new ForbiddenException('User is not the submitter of the map');
    }

    if (map.status !== MapStatus.PRIVATE_TESTING) {
      throw new ForbiddenException('Map is not in private testing');
    }

    await this.createOrUpdatePrivateTestingInvites(this.db, mapID, requestIDs);
  }

  async testInviteResponse(mapID: number, userID: number, accept: boolean) {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { testInvites: true }
    });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    if (map.status !== MapStatus.PRIVATE_TESTING) {
      throw new ForbiddenException('Map is not in private testing');
    }

    const matchingRequest = map.testInvites.find((t) => t.userID === userID);

    if (!matchingRequest) {
      throw new NotFoundException('User does not have a test invite for map');
    }

    await this.db.mapTestInvite.update({
      where: { mapID_userID: { mapID, userID } },
      data: {
        state: accept
          ? MapTestInviteState.ACCEPTED
          : MapTestInviteState.DECLINED
      }
    });

    await this.db.notification.deleteMany({
      where: {
        notifiedUserID: userID,
        mapID,
        type: NotificationType.MAP_TEST_INVITE
      }
    });
  }

  async createOrUpdatePrivateTestingInvites(
    // When not in a transasction, just pass `this.db`.
    tx: ExtendedPrismaServiceTransaction,
    mapID: number,
    userIDs: number[]
  ): Promise<void> {
    if (userIDs.length !== new Set(userIDs).size) {
      throw new BadRequestException('Duplicated user IDs in tested invites');
    }

    const existingUsers = await tx.user.findMany({
      where: { id: { in: userIDs } }
    });

    if (userIDs.length !== new Set(existingUsers).size) {
      throw new BadRequestException('Invalid userID in testing invites');
    }

    const existingInvites = await tx.mapTestInvite.findMany({
      where: { mapID },
      select: { userID: true }
    });
    const existingInviteUserIDs = existingInvites.map((x) => x.userID);

    // We assume some invites may exist already, then add invites for any users
    // on new invites but not existing invites, and remove for any users on
    // existing invites but not new invites.
    await tx.mapTestInvite.createMany({
      data: difference(userIDs, existingInviteUserIDs).map((userID) => ({
        mapID,
        userID,
        state: MapTestInviteState.UNREAD
      }))
    });

    await tx.mapTestInvite.deleteMany({
      where: {
        userID: { in: difference(existingInviteUserIDs, userIDs) }
      }
    });

    const map = await tx.mMap.findUnique({ where: { id: mapID } });

    await this.notifsService.sendNotifications(
      difference(userIDs, existingInviteUserIDs),
      {
        type: NotificationType.MAP_TEST_INVITE,
        mapID: mapID,
        requesterID: map.submitterID
      },
      tx
    );

    await tx.notification.deleteMany({
      where: {
        notifiedUserID: { in: difference(existingInviteUserIDs, userIDs) },
        mapID: mapID,
        type: NotificationType.MAP_TEST_INVITE
      }
    });
  }
}
