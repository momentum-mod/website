import { Injectable } from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';
import { Prisma } from '@prisma/client';
import {
  ActivitiesGetQueryDto,
  ActivityDto,
  PagedResponseDto
} from '@momentum/backend/dto';
import { ActivityType } from '@momentum/constants';

@Injectable()
export class ActivitiesService {
  constructor(private readonly userRepo: UsersRepoService) {}

  async getAll(
    query: ActivitiesGetQueryDto
  ): Promise<PagedResponseDto<ActivityDto>> {
    const where: Prisma.ActivityWhereInput = {};
    if (query.userID) where.userID = query.userID;

    // if type is ALL, just don't add a type filter
    if (query.type !== ActivityType.ALL) where.type = query.type;

    if (query.data) where.data = query.data;

    const dbResponse = await this.userRepo.getActivities(
      where,
      query.skip,
      query.take
    );

    return new PagedResponseDto(ActivityDto, dbResponse);
  }
}
