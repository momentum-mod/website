import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ActivitiesGetQueryDto,
  ActivityDto,
  PagedResponseDto
} from '@momentum/backend/dto';
import { ActivityType } from '@momentum/constants';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async getAll(
    query: ActivitiesGetQueryDto
  ): Promise<PagedResponseDto<ActivityDto>> {
    const where: Prisma.ActivityWhereInput = {};
    if (query.userID) where.userID = query.userID;

    // if type is ALL, just don't add a type filter
    if (query.type !== ActivityType.ALL) where.type = query.type;

    if (query.data) where.data = query.data;

    const dbResponse = await this.db.activity.findManyAndCount({
      where,
      include: { user: { include: { profile: true } } },
      skip: query.skip,
      take: query.take
    });

    return new PagedResponseDto(ActivityDto, dbResponse);
  }
}
