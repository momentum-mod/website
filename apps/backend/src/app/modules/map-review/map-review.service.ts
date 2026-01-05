import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AdminActivityType,
  CombinedRoles,
  mapReviewAssetPath,
  MapReviewSuggestion,
  MapStatuses,
  NotificationType,
  Role
} from '@momentum/constants';
import { MapReview, Prisma, User } from '@momentum/db';
import { File } from '@nest-lab/fastify-multer';
import {
  expandToIncludes,
  isEmpty,
  parallel,
  undefinedIfEmpty
} from '@momentum/util-fn';
import * as Bitflags from '@momentum/bitflags';
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
import {
  InputJsonObject,
  JsonArray,
  JsonObject
} from '@prisma/client/runtime/library';
import { MapDiscordNotifications } from '../maps/map-discord-notifications.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MapReviewStatsDto } from '../../dto/map/map-review-stats.dto';

@Injectable()
export class MapReviewService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    @Inject(forwardRef(() => MapsService))
    private readonly mapsService: MapsService,
    private readonly fileStoreService: FileStoreService,
    private readonly adminActivityService: AdminActivityService,
    private readonly discordNotificationService: MapDiscordNotifications,
    private readonly notifService: NotificationsService
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
      ? dbResponse.filter(({ reviewer }) => {
          const hasOfficialRole =
            reviewer.roles & (Role.ADMIN | Role.MODERATOR | Role.REVIEWER);
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

  async getReviewStats(
    mapID: number,
    userID: number
  ): Promise<MapReviewStatsDto> {
    const map = await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID,
      select: { reviewStats: true }
    });

    return DtoFactory(MapReviewStatsDto, map.reviewStats);
  }

  async createReview(
    userID: number,
    mapID: number,
    body: CreateMapReviewDto,
    imageFiles: File[] = []
  ): Promise<MapReviewDto> {
    // TODO: Ban from this when we do community-wide bans in future

    const map = await this.mapsService.getMapAndCheckReadAccess({
      mapID,
      userID,
      select: {
        submitter: true,
        status: true,
        currentVersion: { select: { zones: true } }
      },
      submissionOnly: true
    });

    if (map.submitterID === userID && body.approves) {
      throw new ConflictException('You cannot approve your own submission');
    }

    if (body.suggestions) {
      try {
        validateSuggestions(
          body.suggestions,
          JSON.parse(map.currentVersion.zones),
          SuggestionType.REVIEW
        );
      } catch (error) {
        throw new BadRequestException(`Invalid suggestions: ${error.message}`);
      }

      const existingUserReviews = await this.db.mapReview.findMany({
        where: { reviewerID: userID, mapID }
      });

      // Not bothering put this in limits.const, so obscure.
      if (existingUserReviews?.length > 10) {
        throw new ConflictException(
          'You cannot post any more reviews for this map'
        );
      }

      if (
        existingUserReviews.some(
          ({ suggestions }) =>
            (suggestions as unknown as MapReviewSuggestion[])?.length > 0 // TODO: #855
        )
      ) {
        throw new ConflictException(
          'You already have a review containing suggestions, please edit that one!'
        );
      }
    }

    if (body.needsResolving || body.approves) {
      const user = await this.db.user.findUnique({ where: { id: userID } });
      if (!Bitflags.has(user.roles, CombinedRoles.REVIEWER_AND_ABOVE))
        throw new ForbiddenException(
          body.needsResolving
            ? 'You cannot submit reviews that need resolving'
            : 'You cannot submit an approving review'
        );
    }

    const images: [string, File][] = imageFiles.map((file) => [
      `${uuidv4()}.${file.originalname.split('.').at(-1)}`,
      file
    ]);

    // Ignore suggestions that had neither tier, gameplay rating nor tag,
    // since frontend/DTO may allow it but this is meaningless data.
    const suggestions = body.suggestions?.filter(
      ({ tier, gameplayRating, tags }) =>
        tier != null || gameplayRating != null || tags != null
    );

    const newData = {
      mainText: body.mainText,
      suggestions: suggestions as unknown as JsonArray,
      // If it needs resolving, set `resolved` to `false`. Otherwise it'll
      // be null, and it doesn't need resolving.
      resolved: body.needsResolving ? false : null,
      approves: body.approves ?? false
    } satisfies JsonObject;

    const [dbResponse] = await parallel(
      this.db.$transaction(async (tx) => {
        const newReview = await tx.mapReview.create({
          data: {
            reviewer: { connect: { id: userID } },
            mmap: { connect: { id: mapID } },
            imageIDs: images.map(([id]) => id),
            mainText: body.mainText,
            approves: body.approves ?? false,
            ...newData,
            editHistory: [{ ...newData, editorID: userID, date: new Date() }]
          },
          include: {
            mmap: true,
            reviewer: true
          }
        });

        if (userID !== map.submitterID) {
          await this.notifService.sendNotifications(
            {
              data: {
                type: NotificationType.MAP_REVIEW_POSTED,
                notifiedUserID: map.submitterID,
                userID,
                mapID,
                reviewID: newReview.id,
                createdAt: new Date()
              }
            },
            tx
          );
        }

        return newReview;
      }),
      ...images.map(([id, file]) =>
        this.fileStoreService.storeFile(
          file.buffer,
          mapReviewAssetPath(id),
          (file.mimetype ?? file.filename.endsWith('png'))
            ? 'image/png'
            : 'image/jpeg'
        )
      )
    );

    if (MapStatuses.IN_SUBMISSION.includes(map.status)) {
      void this.discordNotificationService.sendMapReviewToMapThread(dbResponse);
    }

    await this.updateReviewStats(mapID);

    return DtoFactory(MapReviewDto, dbResponse);
  }

  /**
   * Update a review submitted by the logged-in-user
   *
   * This endpoint doesn't support updating images yet. It's very unlikely that
   * someone will do this, and quite a bit of hassle on both front and backend.
   */
  async updateReview(
    reviewID: number,
    userID: number,
    body: UpdateMapReviewDto
  ): Promise<MapReviewDto> {
    if (isEmpty(body)) {
      throw new BadRequestException('Empty body');
    }

    const review = await this.db.mapReview.findUnique({
      where: { id: reviewID },
      include: { reviewer: true }
    });

    if (!review) throw new NotFoundException('Review not found');

    // Check both that user can view the map, and map is in submission
    const map = await this.mapsService.getMapAndCheckReadAccess({
      mapID: review.mapID,
      userID,
      submissionOnly: true,
      include: { currentVersion: { select: { zones: true } } }
    });

    if (body.suggestions) {
      try {
        validateSuggestions(
          body.suggestions,
          JSON.parse(map.currentVersion.zones),
          SuggestionType.REVIEW
        );
      } catch (error) {
        throw new BadRequestException(`Invalid suggestions: ${error.message}`);
      }
    }

    // Need to use admin endpoint and updateAsReviewer method for admin stuff,
    // cleaner code that way.
    if (review.reviewerID !== userID)
      throw new ForbiddenException('Not the review author');

    const isReviewer = Bitflags.has(
      review.reviewer.roles,
      CombinedRoles.REVIEWER_AND_ABOVE
    );

    if (
      !isReviewer &&
      review.resolved === null &&
      body.resolved !== undefined
    ) {
      // Don't allow making a review that needs resolving. But allow cases
      // with a review made by a normal user, that an admin sets to
      // needs resolving (i.e. false) - submitter of the review can
      // resolve/unresolved from then on.
      throw new ForbiddenException();
    }

    if (!isReviewer && body.approves) {
      throw new ForbiddenException();
    }

    if (review.resolved && body.needsResolving === false) {
      throw new BadRequestException();
    }

    const suggestions = body.suggestions as unknown as InputJsonObject; // TODO: #855

    const updated = await this.db.mapReview.update({
      where: { id: reviewID },
      include: { resolver: true },
      data: {
        mainText: body.mainText,
        suggestions,
        resolved: body.resolved,
        approves: body.approves ?? false,
        resolverID: body.resolved ? userID : null,
        editHistory: [
          ...(review.editHistory as JsonArray),
          {
            // We only want to log actual changes, so anything here being
            // undefined is fine.
            mainText: body.mainText,
            suggestions,
            resolved: body.resolved,
            approves: body.approves,
            editorID: userID,
            date: new Date()
          }
        ]
      }
    });

    await this.updateReviewStats(review.mapID);

    return DtoFactory(MapReviewDto, updated);
  }

  /**
   * Update a review as a Reviewer/Moderator/Admin
   */
  async updateReviewAsReviewer(
    reviewID: number,
    userID: number,
    data: AdminUpdateMapReviewDto
  ): Promise<MapReviewDto> {
    if (isEmpty(data)) {
      throw new BadRequestException('Empty body');
    }

    const review = await this.db.mapReview.findUnique({
      where: { id: reviewID },
      include: { reviewer: true }
    });

    if (!review) throw new NotFoundException('Review not found');

    // RoleGuard does most auth, but some maps are still restricted, e.g. in
    // PRIVATE_TESTING
    await this.mapsService.getMapAndCheckReadAccess({
      mapID: review.mapID,
      userID,
      submissionOnly: true
    });

    // Not creating admin activities here, since review resolution is very
    // 'normal' behaviour, and gets tracked in the edit history.
    const updated = await this.db.mapReview.update({
      where: { id: reviewID },
      include: { resolver: true },
      data: {
        resolved: data.resolved,
        resolverID: data.resolved ? userID : null,
        editHistory: [
          ...(review.editHistory as JsonArray),
          {
            resolved: data.resolved,
            editorID: userID,
            date: new Date()
          }
        ]
      }
    });

    await this.updateReviewStats(updated.mapID);

    return DtoFactory(MapReviewDto, updated);
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
      this.db.$transaction([
        this.db.mapReview.delete({ where: { id: reviewID } }),
        this.db.notification.deleteMany({
          where: {
            type: NotificationType.MAP_REVIEW_POSTED,
            reviewID: reviewID
          }
        })
      ]),
      this.fileStoreService.deleteFiles(
        review.imageIDs.map((id) => mapReviewAssetPath(id))
      )
    );

    await this.updateReviewStats(review.mapID);
  }

  /** Remove every stored file for every map review */
  async deleteAllReviewAssetsForMap(mapID: number): Promise<void> {
    const imagePaths = await this.db.mapReview
      .findMany({ where: { mapID }, select: { imageIDs: true } })
      .then((reviews) =>
        reviews.flatMap(({ imageIDs }) =>
          imageIDs.map((imageID) => mapReviewAssetPath(imageID))
        )
      );

    await this.fileStoreService.deleteFiles(imagePaths);
  }

  // TODO: Doing this is in JS is silly, but reviews are posted fairly
  // infrequently, whilst this table is queried a lot. Tempted to use
  // a view/materialized view but Prisma support is quite limited. Worth
  // reconsidering in the future!
  private async updateReviewStats(mapID: number): Promise<void> {
    const reviews = await this.db.mapReview.findMany({ where: { mapID } });

    await this.db.mapReviewStats.update({
      where: { mapID },
      data: {
        total: reviews.length,
        approvals: reviews.filter(({ approves }) => approves === true).length,
        resolved: reviews.filter(({ resolved }) => resolved === true).length,
        unresolved: reviews.filter(({ resolved }) => resolved === false).length
      }
    });
  }
}
