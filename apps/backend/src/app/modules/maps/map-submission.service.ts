import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  DtoFactory,
  MapDto,
  MapSummaryDto,
  PagedResponseDto
} from '@momentum/backend/dto';
import { Prisma } from '@prisma/client';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { expandToIncludes } from '@momentum/util-fn';

@Injectable()
export class MapSubmissionService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService
  ) {}

  async getSubmittedMaps(
    userID: number,
    skip?: number,
    take?: number,
    search?: string,
    expand?: string[]
  ): Promise<PagedResponseDto<MapDto>> {
    const where: Prisma.MMapWhereInput = { submitterID: userID };

    if (search) where.name = { contains: search };

    const submittedMapsRes = await this.db.mMap.findManyAndCount({
      where,
      include: expandToIncludes(expand),
      skip,
      take
    });

    return new PagedResponseDto(MapDto, submittedMapsRes);
  }

  async getSubmittedMapsSummary(userID: number): Promise<MapSummaryDto[]> {
    const result = await this.db.mMap.groupBy({
      by: ['status'],
      where: { submitterID: userID },
      _count: {
        status: true
      }
    });

    if (!result) throw new NotFoundException('No submitted Maps found');

    return result.map(({ _count, status }) =>
      DtoFactory(MapSummaryDto, {
        status: status,
        statusCount: _count.status
      })
    );
  }
}
