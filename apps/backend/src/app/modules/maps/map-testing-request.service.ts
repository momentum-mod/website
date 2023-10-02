import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { MapStatusNew, MapTestingRequestState } from '@momentum/constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../database/prisma.extension';
import { difference } from '@momentum/util-fn';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';

@Injectable()
export class MapTestingRequestService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async updateTestingRequests(
    mapID: number,
    requestIDs: number[],
    userID: number
  ) {
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    if (map.submitterID !== userID) {
      throw new ForbiddenException('User is not the submitter of the map');
    }

    if (map.status !== MapStatusNew.PRIVATE_TESTING) {
      throw new ForbiddenException('Map is not in private testing');
    }

    await this.createOrUpdatePrivateTestingInvites(this.db, mapID, requestIDs);
  }

  async testingRequestResponse(mapID: number, userID: number, accept: boolean) {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { testingRequests: true }
    });

    if (!map) {
      throw new NotFoundException('Map does not exist');
    }

    if (map.status !== MapStatusNew.PRIVATE_TESTING) {
      throw new ForbiddenException('Map is not in private testing');
    }

    const matchingRequest = map.testingRequests.find(
      (t) => t.userID === userID
    );

    if (!matchingRequest) {
      throw new NotFoundException(
        'User does not have a testing request for map'
      );
    }

    await this.db.mapTestingRequest.update({
      where: { mapID_userID: { mapID, userID } },
      data: {
        state: accept
          ? MapTestingRequestState.ACCEPTED
          : MapTestingRequestState.DECLINED
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

    const existingInvites = await tx.mapTestingRequest.findMany({
      where: { mapID },
      select: { userID: true }
    });
    const existingInviteUserIDs = existingInvites.map((x) => x.userID);

    // We assume some invites may exist already, then add invites for any users
    // on new invites but not existing invites, and remove for any users on
    // existing invites but not new invites.
    await tx.mapTestingRequest.createMany({
      data: difference(userIDs, existingInviteUserIDs).map((userID) => ({
        mapID,
        userID,
        state: MapTestingRequestState.UNREAD
      }))
    });

    await tx.mapTestingRequest.deleteMany({
      where: {
        userID: { in: difference(existingInviteUserIDs, userIDs) }
      }
    });
  }
}
