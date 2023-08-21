import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  CreateMapCreditDto,
  DtoFactory,
  MapCreditDto
} from '@momentum/backend/dto';
import { Prisma } from '@prisma/client';
import { MMap } from '.prisma/client';
import { Bitflags } from '@momentum/bitflags';
import {
  ActivityType,
  MapCreditType,
  MapStatus,
  Role
} from '@momentum/constants';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { MapsService } from './maps.service';
import { expandToIncludes, findWithIndex } from '@momentum/util-fn';

@Injectable()
export class MapCreditsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly mapsService: MapsService
  ) {}

  async getCredits(
    mapID: number,
    loggedInUserID: number,
    expand: string[]
  ): Promise<MapCreditDto[]> {
    await this.mapsService.getMapAndCheckReadAccess(mapID, loggedInUserID);

    const dbResponse = await this.db.mapCredit.findMany({
      where: { mapID },
      include: expandToIncludes(expand)
    });

    return dbResponse.map((x) => DtoFactory(MapCreditDto, x));
  }

  async getCredit(
    mapID: number,
    userID: number,
    loggedInUserID: number,
    expand: string[]
  ): Promise<MapCreditDto> {
    await this.mapsService.getMapAndCheckReadAccess(mapID, loggedInUserID);

    const dbResponse = await this.db.mapCredit.findUnique({
      where: { mapID_userID: { mapID, userID } },
      include: expandToIncludes(expand)
    });

    if (!dbResponse) throw new NotFoundException('Map credit not found');

    return DtoFactory(MapCreditDto, dbResponse);
  }

  async updateCredits(
    mapID: number,
    body: CreateMapCreditDto[],
    loggedInUserID: number
  ): Promise<MapCreditDto[]> {
    if (body.length === 0) {
      throw new BadRequestException('Empty body');
    }

    if (!body.some((credit) => credit.type === MapCreditType.AUTHOR))
      throw new BadRequestException('Credits do not contain an AUTHOR');

    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { credits: true }
    });
    if (!map) {
      throw new NotFoundException('Map not found');
    }

    await this.checkCreditChangePermissions(map, loggedInUserID);

    const oldCredits = map.credits;

    return await this.db.$transaction(async (tx) => {
      // Since we don't care about `createdAt`/`updatedAt`s, by far the simplest
      // approach to this is to delete existing credits, then insert again
      // in order of the body array. That way, we get every item ordered in DB
      // (so no need for complex ordering relations, which would be especially
      // annoying on joins. Perhaps slightly slower, but not a common endpoint
      // anyway.
      await tx.mapCredit.deleteMany({ where: { mapID } });

      const response: MapCreditDto[] = [];

      try {
        // Using loop instead of createMany as unsure if it guarantees correct
        // creation order.
        for (const credit of body) {
          const newCredit = await tx.mapCredit.create({
            data: { mapID, ...credit },
            include: { user: true }
          });
          response.push(DtoFactory(MapCreditDto, newCredit));

          const [oldCredit, oldCreditIdx] = findWithIndex(
            oldCredits,
            (c) => c.userID === newCredit.userID
          );

          // If it's an author credit, create activity, unless credit already
          // existed.
          if (
            newCredit.type === MapCreditType.AUTHOR &&
            !(oldCredit?.type === MapCreditType.AUTHOR)
          ) {
            await tx.activity.create({
              data: {
                type: ActivityType.MAP_UPLOADED,
                data: newCredit.mapID,
                userID: newCredit.userID
              }
            });
          }

          // Remove matching old credit, if exists
          oldCredits.splice(oldCreditIdx, 1);
        }

        // Any credits remaining in here have been deleted, so deleted any
        // MAP_UPLOADED activities for author credits
        for (const oldCredit of oldCredits) {
          if (oldCredit.type === MapCreditType.AUTHOR)
            await tx.activity.deleteMany({
              where: {
                type: ActivityType.MAP_UPLOADED,
                data: oldCredit.mapID,
                userID: oldCredit.userID
              }
            });
        }
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Input contains duplicate users');
        }
        throw error;
      }

      return response;
    });
  }

  private async checkCreditChangePermissions(map: MMap, userID: number) {
    const user = await this.db.user.findUnique({
      where: { id: userID },
      select: { roles: true }
    });

    // Let admins/mods update in any state
    if (
      !(
        Bitflags.has(user.roles, Role.MODERATOR) ||
        Bitflags.has(user.roles, Role.ADMIN)
      )
    ) {
      if (map.submitterID !== userID)
        throw new ForbiddenException('User is not the submitter of this map');
      if (map.status !== MapStatus.NEEDS_REVISION)
        throw new ForbiddenException('Map is not in NEEDS_REVISION state');
    }
  }
}
