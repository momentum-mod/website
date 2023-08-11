import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  CreateMapCreditDto,
  DtoFactory,
  expandToPrismaIncludes,
  MapCreditDto,
  UpdateMapCreditDto
} from '@momentum/backend/dto';
import { MapCredit, Prisma } from '@prisma/client';
import { MMap } from '.prisma/client';
import { Bitflags } from '@momentum/bitflags';
import {
  ActivityType,
  MapCreditType,
  MapStatus,
  Role
} from '@momentum/constants';
import { DbService } from '../database/db.service';

@Injectable()
export class MapCreditsService {
  constructor(private readonly db: DbService) {}

  async getCredits(mapID: number, expand: string[]): Promise<MapCreditDto[]> {
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Map not found');

    const dbResponse = await this.db.mapCredit.findMany({
      where: { mapID },
      include: expandToPrismaIncludes(
        expand?.filter((x) => ['user'].includes(x))
      )
    });

    return dbResponse.map((x) => DtoFactory(MapCreditDto, x));
  }

  async createCredit(
    mapID: number,
    createMapCredit: CreateMapCreditDto,
    userID: number
  ): Promise<MapCreditDto> {
    const map = await this.db.mMap.findUnique({
      where: { id: mapID },
      include: { credits: true }
    });

    if (!map) throw new NotFoundException('Map not found');

    await this.checkCreditChangePermissions(map, userID);

    if (
      await this.db.mapCredit.exists({
        where: {
          mapID,
          userID: createMapCredit.userID,
          type: createMapCredit.type
        }
      })
    )
      throw new ConflictException('Map credit already exists');

    if (
      !(await this.db.user.exists({
        where: { id: createMapCredit.userID }
      }))
    )
      throw new BadRequestException('Credited user does not exist');

    const dbResponse = await this.db.mapCredit.create({
      data: {
        type: createMapCredit.type,
        mmap: { connect: { id: mapID } },
        user: { connect: { id: createMapCredit.userID } }
      }
    });

    await this.updateMapCreditActivities(dbResponse);

    return DtoFactory(MapCreditDto, dbResponse);
  }

  async getCredit(
    mapCreditID: number,
    expand: string[]
  ): Promise<MapCreditDto> {
    const dbResponse = await this.db.mapCredit.findUnique({
      where: { id: mapCreditID },
      include: expandToPrismaIncludes(expand)
    });

    if (!dbResponse) throw new NotFoundException('Map credit not found');

    return DtoFactory(MapCreditDto, dbResponse);
  }

  async updateCredit(
    mapCreditID: number,
    creditUpdate: UpdateMapCreditDto,
    userID: number
  ): Promise<void> {
    if (!creditUpdate.userID && !creditUpdate.type)
      throw new BadRequestException('No update data provided');

    const credit = await this.db.mapCredit.findUnique({
      where: { id: mapCreditID },
      include: { user: true, mmap: true }
    });

    if (!credit || !credit.mmap || !credit.user)
      throw new NotFoundException('Invalid map credit');

    await this.checkCreditChangePermissions(credit.mmap, userID);

    if (
      creditUpdate.userID &&
      !(await this.db.user.exists({
        where: { id: creditUpdate.userID }
      }))
    )
      throw new BadRequestException('Credited user does not exist');

    // Check for different credits with same map, user and type, throw if exists
    if (
      await this.db.mapCredit.exists({
        where: {
          NOT: { id: credit.id },
          userID: creditUpdate.userID ?? credit.userID,
          type: creditUpdate.type ?? credit.type,
          mapID: credit.mapID
        }
      })
    )
      throw new ConflictException('Cannot have duplicate map credits');

    const data: Prisma.MapCreditUpdateInput = {};
    if (creditUpdate.userID)
      data.user = { connect: { id: creditUpdate.userID } };
    if (creditUpdate.type) data.type = creditUpdate.type;

    const newCredit = await this.db.mapCredit.update({
      where: { id: mapCreditID },
      data
    });

    await this.updateMapCreditActivities(newCredit, credit);
  }

  async deleteCredit(mapCreditID: number, userID: number): Promise<void> {
    const credit = await this.db.mapCredit.findUnique({
      where: { id: mapCreditID },
      include: { user: true, mmap: true }
    });

    if (!credit || !credit.mmap || !credit.user)
      throw new NotFoundException('Invalid map credit');

    await this.checkCreditChangePermissions(credit.mmap, userID);

    await this.db.mapCredit.delete({ where: { id: mapCreditID } });

    await this.updateMapCreditActivities(null, credit);
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

  private async updateMapCreditActivities(
    newCredit?: MapCredit,
    oldCredit?: MapCredit
  ): Promise<void> {
    const deleteOldActivity = () =>
      this.db.activity.deleteMany({
        where: {
          type: ActivityType.MAP_UPLOADED,
          data: oldCredit.mapID,
          userID: oldCredit.userID
        }
      });

    const createNewActivity = () =>
      this.db.activity.create({
        data: {
          type: ActivityType.MAP_UPLOADED,
          data: newCredit.mapID,
          userID: newCredit.userID
        }
      });

    // If oldCredit is null, a credit was created
    if (!oldCredit) {
      if (newCredit?.type === MapCreditType.AUTHOR) await createNewActivity();
      return;
    }

    // If newCredit is null, a credit was deleted
    if (!newCredit) {
      if (oldCredit?.type === MapCreditType.AUTHOR) await deleteOldActivity();
      return;
    }

    const oldCreditIsAuthor = oldCredit.type === MapCreditType.AUTHOR;
    const newCreditIsAuthor = newCredit.type === MapCreditType.AUTHOR;
    const userChanged = oldCredit.userID !== newCredit.userID;

    // If the new credit type was changed to author
    if (!oldCreditIsAuthor && newCreditIsAuthor) {
      // Create activity for newCredit.userID
      await createNewActivity();
      return;
    } else if (oldCreditIsAuthor && !newCreditIsAuthor) {
      // If the new credit type was changed from author to something else
      // Delete activity for oldCredit.userID
      await deleteOldActivity();
      return;
    } else if (oldCreditIsAuthor && newCreditIsAuthor && userChanged) {
      // If the credit is still an author but the user changed
      // Delete activity for oldCredit.userID and create activity for
      // newCredit.userID
      await deleteOldActivity();
      await createNewActivity();
      return;
    } else return; // All other cases result in no change in authors
  }
}
