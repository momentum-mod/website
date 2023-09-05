import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import {
  CreateMapReviewDto,
  DtoFactory,
  DtoFactory,
  MapReviewDto,
  MapReviewGetIdDto,
  MapReviewsGetQueryDto,
  PagedResponseDto
} from '@momentum/backend/dto';
import { MapStatusNew, Role, CombinedRoles } from '@momentum/constants';
import { MapReview, Prisma, User } from '@prisma/client';
import { MapsService } from './maps.service';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import { expandToIncludes, undefinedIfEmpty } from '@momentum/util-fn';
import { Bitflags } from '@momentum/bitflags';

@Injectable()
export class MapReviewService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly mapsService: MapsService
  ) {}

  async getAllReviews(
    mapID: number,
    userID: number,
    query: MapReviewsGetQueryDto
  ): Promise<PagedResponseDto<MapReviewDto>> {
    await this.mapsService.getMapAndCheckReadAccess(mapID, userID);

    const include: Prisma.MapReviewInclude =
      expandToIncludes(query.expand, {
        mappings: [{ expand: 'map', model: 'mmap' }]
      }) ?? {};

    // If we're filtering by officiality we need to know user roles
    const hasRoleFiltering = query.official !== undefined;
    if (hasRoleFiltering) {
      include['reviewer'] = true;
    }

    const dbResponse: (MapReview & { reviewer?: User })[] =
      await this.db.mapReview.findMany({
        where: { mapID },
        include: undefinedIfEmpty(include)
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

  async createReview(
    userID: number,
    mapID: number,
    body: CreateMapReviewDto
  ): Promise<MapReviewDto> {
    // get map and check if it exists
    const map = await this.db.mMap.findUnique({ where: { id: mapID } });

    if (!map) throw new NotFoundException('Map not found');

    // get user to check if he has write permission
    const user = await this.db.user.findUnique({ where: { id: userID } });

    // check if review can be created
    if (
      [
        MapStatusNew.APPROVED,
        MapStatusNew.DISABLED,
        MapStatusNew.REJECTED
      ].includes(map.status)
    )
      throw new ForbiddenException(
        'User cannot create a review for the given map'
      );

    const dbResponse = await this.db.mapReview.create({
      data: {
        reviewer: { connect: { id: userID } },
        mmap: { connect: { id: map.id } },
        mainText: body.mainText
      }
    });

    return DtoFactory(MapReviewDto, dbResponse);
  }

  async getReview(
    mapID: number,
    reviewID: number,
    userID: number,
    query: MapReviewGetIdDto
  ): Promise<MapReviewDto> {
    await this.mapsService.getMapAndCheckReadAccess(mapID, userID);

    const review = await this.db.mapReview.findFirst({
      where: { id: reviewID, mapID },
      include: expandToIncludes(query.expand, {
        mappings: [{ expand: 'map', model: 'mmap' }]
      })
    });

    if (!review) throw new NotFoundException('Review not found');

    return DtoFactory(MapReviewDto, review);
  }

  async deleteReview(
    mapID: number,
    reviewID: number,
    userID: number
  ): Promise<void> {
    await this.mapsService.getMapAndCheckReadAccess(mapID, userID);
    const user = await this.db.user.findUnique({ where: { id: userID } });

    const review = await this.db.mapReview.findFirst({
      where: { id: reviewID, mapID }
    });

    if (!review) throw new NotFoundException('Review not found');

    if (
      review.reviewerID === userID ||
      Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)
    ) {
      await this.db.mapReview.delete({ where: { id: reviewID } });
    } else {
      throw new ForbiddenException('User is not the submitter of this review');
    }
  }
}
