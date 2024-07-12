import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as Bitflags from '@momentum/bitflags';
import { AdminActivityType, Role } from '@momentum/constants';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { AdminActivityDto, PagedResponseDto } from '../../dto';

@Injectable()
export class AdminActivityService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async create(
    adminID: number,
    types: AdminActivityType | AdminActivityType[],
    target: number,
    newData: object,
    oldData?: object,
    comment?: string
  ) {
    if (!Array.isArray(types)) types = [types];
    await this.db.adminActivity.createMany({
      data: types.map((type) => ({
        type,
        target,
        newData,
        oldData: oldData || {},
        comment,
        userID: adminID
      }))
    });
  }

  async getList(
    userID?: number,
    skip?: number,
    take?: number,
    filter?: AdminActivityType[]
  ) {
    if (userID) {
      const user = await this.db.user.findUnique({ where: { id: userID } });

      if (!Bitflags.has(user.roles, Role.ADMIN | Role.MODERATOR)) {
        throw new BadRequestException(
          'Requested user is not an admin or a moderator'
        );
      }
    }

    const activities = await this.db.adminActivity.findManyAndCount({
      where: { userID, type: { in: filter } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip
    });

    return new PagedResponseDto(AdminActivityDto, activities);
  }
}
