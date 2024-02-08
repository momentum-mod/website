import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AdminActivityType,
  CombinedRoles,
  mapReviewAssetPath,
  MapReviewEdit,
  MapReviewSuggestion,
  MapZones,
  Role
} from '@momentum/constants';
import {
  MapReview,
  MapSubmission,
  MapSubmissionVersion,
  Prisma,
  User
} from '@prisma/client';
import { File } from '@nest-lab/fastify-multer';
import {
  expandToIncludes,
  isEmpty,
  parallel,
  undefinedIfEmpty
} from '@momentum/util-fn';
import { Bitflags } from '@momentum/bitflags';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import {
  AdminUpdateMapReviewDto,
  CreateMapReviewDto,
  DtoFactory,
  MapReviewDto,
  MapReviewGetIdDto,
  MapReviewsGetQueryDto,
  PagedResponseDto,
  UpdateMapReviewDto
} from '../../dto';
import { v4 as uuidv4 } from 'uuid';
import { FileStoreService } from '../filestore/file-store.service';
import { SuggestionType, validateSuggestions } from '@momentum/formats/zone';
import { MapsService } from '../maps/maps.service';
import { AdminActivityService } from '../admin/admin-activity.service';

@Injectable()
export class MapReviewService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly mapsService: MapsService,
    private readonly fileStoreService: FileStoreService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  async getAllReviews(
    mapID: number,
    userID: number,
    query: MapReviewsGetQueryDto
  ): Promise<PagedResponseDto<MapReviewDto>> {
    await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID
    });

    const include: Prisma.MapReviewInclude =
      expandToIncludes(query.expand, {
        mappings: [{ expand: 'map', model: 'mmap' }]
      }) ?? {};

    if (query.comments > 0)
      include.comments = {
        include: { user: true },
        take: query.comments,
        orderBy: { createdAt: 'desc' }
      };

    // If we're filtering by officiality we need to know user roles
    const hasRoleFiltering = query.official !== undefined;
    if (hasRoleFiltering) {
      include['reviewer'] = true;
    }

    include._count = { select: { comments: true } };

    const dbResponse: Array<
      MapReview & {
        reviewer?: User;
        _count?: { comments: number };
        numComments?: number;
      }
    > = await this.db.mapReview.findMany({
      where: { mapID },
      include: undefinedIfEmpty(include),
      orderBy: { createdAt: 'desc' }
    });

    for (const review of dbResponse) {
      review.numComments = review._count.comments;
      delete review._count;
    }

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

  async getReview(
    reviewID: number,
    userID: number,
    query: MapReviewGetIdDto
  ): Promise<MapReviewDto> {
    const review = await this.db.mapReview.findFirst({
      where: { id: reviewID },
      include: expandToIncludes(query.expand, {
        mappings: [{ expand: 'map', model: 'mmap' }]
      })
    });

    if (!review) throw new NotFoundException('Review not found');

    await this.mapsService.getMapAndCheckReadAccess({
      mapID: review.mapID,
      userID,
      submissionOnly: true
    });

    return DtoFactory(MapReviewDto, review);
  }

  async deleteReview(
    reviewID: number,
    userID: number,
    asAdmin: boolean
  ): Promise<void> {
    const review = await this.db.mapReview.findUnique({
      where: { id: reviewID },
      include: { reviewer: true }
    });

    if (!review) throw new NotFoundException('Review not found');

    await this.mapsService.getMapAndCheckReadAccess({
      mapID: review.mapID,
      userID,
      submissionOnly: true
    });

    if (asAdmin) {
      await this.adminActivityService.create(
        userID,
        AdminActivityType.REVIEW_DELETED,
        reviewID,
        review
      );
    } else {
      if (review.reviewerID !== userID) {
        throw new ForbiddenException(
          'User is not the submitter of this review'
        );
      }
    }

    await parallel(
      this.db.mapReview.delete({ where: { id: reviewID } }),
      this.fileStoreService.deleteFiles(
        review.imageIDs.map((id) => mapReviewAssetPath(id))
      )
    );
  }
}
