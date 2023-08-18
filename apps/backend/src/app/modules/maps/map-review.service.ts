import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../database/db.service';
import {
  MapReviewDto,
  MapReviewsGetQueryDto,
  PagedResponseDto,
  expandToPrismaIncludes
} from '@momentum/backend/dto';
import { Role } from '@momentum/constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class MapReviewService {
  constructor(private readonly db: DbService) {}

  async getReviews(
    mapID: number,
    query: MapReviewsGetQueryDto
  ): Promise<PagedResponseDto<MapReviewDto>> {
    // check if map exists
    if (!(await this.db.mMap.exists({ where: { id: mapID } })))
      throw new NotFoundException('Map not found');

    let include: Prisma.MapReviewInclude = expandToPrismaIncludes(
      // Map 'map' expand to 'mmap'
      query.expand?.map((x) => (x === 'map' ? 'mmap' : x))
    );

    // If we're filtering by officiality we need to know user roles
    const hasRoleFiltering = query.official !== undefined;
    if (hasRoleFiltering) {
      include ??= {};
      include['reviewer'] = true;
    }

    const dbResponse = await this.db.mapReview.findMany({
      where: { mapID },
      include
    });

    // Filter by official/unofficial if exists on query
    const filteredResponse = hasRoleFiltering
      ? dbResponse.filter((x) => {
          const hasOfficialRole = [
            Role.ADMIN,
            Role.MODERATOR,
            Role.REVIEWER
          ].includes(x.reviewer.roles);
          return query.official ? hasOfficialRole : !hasOfficialRole;
        })
      : dbResponse;

    // We can't do bitwise WHEREs with Prisma, so do the pagination in JS for
    // now. DB response is unlikely to be enormous, and endpoint isn't heavily
    // used, so tolerable for now. Could write raw if needed in the future.
    const totalCount = filteredResponse.length;
    const paginatedResponse = filteredResponse.slice(
      query.skip,
      query.skip + query.take
    );

    // We needed the 'reviewer' include for the official/unofficial reviews
    // filtering logic above, but it might not have been requested in the
    // original query - delete if that's the case
    if (hasRoleFiltering && !query.expand?.includes('reviewer'))
      for (const review of filteredResponse) delete review.reviewer;

    return new PagedResponseDto(MapReviewDto, [paginatedResponse, totalCount]);
  }
}
