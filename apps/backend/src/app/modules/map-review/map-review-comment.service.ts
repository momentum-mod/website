import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable
} from '@nestjs/common';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';
import {
  CreateMapReviewCommentDto,
  DtoFactory,
  MapReviewCommentDto,
  PagedQueryDto,
  PagedResponseDto,
  UpdateMapReviewCommentDto
} from '../../dto';
import { MapsService } from '../maps/maps.service';
import { isEmpty, parallel } from '@momentum/util-fn';
import { Bitflags } from '@momentum/bitflags';
import { AdminActivityType, CombinedRoles } from '@momentum/constants';
import { AdminActivityService } from '../admin/admin-activity.service';

@Injectable()
export class MapReviewCommentService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly mapsService: MapsService,
    private readonly adminActivityService: AdminActivityService
  ) {}

  async getComments(
    reviewID: number,
    userID: number,
    query?: PagedQueryDto
  ): Promise<PagedResponseDto<MapReviewCommentDto>> {
    const [comments] = await parallel(
      this.db.mapReviewComment.findManyAndCount({
        where: { reviewID },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: query?.skip,
        take: query?.take
      }),
      this.checkReviewPerms(reviewID, userID)
    );

    return new PagedResponseDto(MapReviewCommentDto, comments);
  }

  async postComment(
    reviewID: number,
    userID: number,
    body: CreateMapReviewCommentDto
  ): Promise<MapReviewCommentDto> {
    if (isEmpty(body)) {
      throw new BadRequestException('Empty body');
    }

    await this.checkReviewPerms(reviewID, userID);

    return DtoFactory(
      MapReviewCommentDto,
      await this.db.mapReviewComment.create({
        data: { text: body.text, reviewID, userID },
        include: { user: true }
      })
    );
  }

  async updateComment(
    commentID: number,
    userID: number,
    body: UpdateMapReviewCommentDto
  ): Promise<MapReviewCommentDto> {
    if (isEmpty(body)) {
      throw new BadRequestException('Empty body');
    }

    const comment = await this.db.mapReviewComment.findUnique({
      where: { id: commentID },
      include: { review: { include: { mmap: true } } }
    });

    if (comment.userID !== userID) throw new ForbiddenException();

    await this.mapsService.getMapAndCheckReadAccess({
      userID,
      map: comment.review.mmap,
      submissionOnly: true
    });

    return DtoFactory(
      MapReviewCommentDto,
      await this.db.mapReviewComment.update({
        where: { id: commentID },
        data: { text: body.text }
      })
    );
  }

  async deleteComment(commentID: number, userID: number): Promise<void> {
    const comment = await this.db.mapReviewComment.findUnique({
      where: { id: commentID },
      include: { review: { include: { mmap: true } } }
    });

    if (comment.userID !== userID) {
      const user = await this.db.user.findUnique({ where: { id: userID } });

      if (Bitflags.has(user.roles, CombinedRoles.MOD_OR_ADMIN)) {
        await this.adminActivityService.create(
          userID,
          AdminActivityType.REVIEW_COMMENT_DELETED,
          commentID,
          comment
        );
      } else {
        throw new ForbiddenException();
      }
    }

    await this.mapsService.getMapAndCheckReadAccess({
      userID,
      map: comment.review.mmap,
      submissionOnly: true
    });

    await this.db.mapReviewComment.delete({ where: { id: commentID } });
  }

  private async checkReviewPerms(
    reviewID: number,
    userID: number
  ): Promise<void> {
    const review = await this.db.mapReview.findUnique({
      where: { id: reviewID },
      include: { mmap: true }
    });

    await this.mapsService.getMapAndCheckReadAccess({
      map: review.mmap,
      userID,
      submissionOnly: true
    });
  }
}
