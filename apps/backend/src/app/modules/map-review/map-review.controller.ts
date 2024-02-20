import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { MapReviewService } from './map-review.service';
import { MapReviewCommentService } from './map-review-comment.service';
import { ParseIntSafePipe } from '../../pipes';
import { LoggedInUser } from '../../decorators';
import {
  ApiOkPagedResponse,
  CreateMapReviewCommentDto,
  MapReviewCommentDto,
  MapReviewDto,
  MapReviewGetIdDto,
  PagedQueryDto,
  PagedResponseDto,
  UpdateMapReviewCommentDto,
  UpdateMapReviewDto
} from '../../dto';

/**
 * These endpoints handle only individual reviews, paginated reviews and posting
 * reviews are on /maps/:mapID/reviews
 */
@Controller('map-review')
@ApiTags('Map Reviews')
@ApiBearerAuth()
export class MapReviewController {
  constructor(
    private readonly reviewService: MapReviewService,
    private readonly commentService: MapReviewCommentService
  ) {}

  @Get('/:reviewID')
  @ApiOperation({ summary: 'Returns the requested review' })
  @ApiOkResponse({ description: 'The requested review of the map' })
  @ApiNotFoundResponse({
    description: 'Either the map or review was not found'
  })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  getReview(
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number,
    @Query() query?: MapReviewGetIdDto
  ): Promise<MapReviewDto> {
    return this.reviewService.getReview(reviewID, userID, query);
  }

  @Patch('/:reviewID')
  @ApiOperation({
    summary: "Update a review for a map. Doesn't yet support updating images."
  })
  @ApiOkResponse({ type: MapReviewDto, description: 'The updated review' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({
    description: 'User is not the submitter of the review'
  })
  @ApiBody({ type: UpdateMapReviewDto, required: true })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  updateReview(
    @Body() body: UpdateMapReviewDto,
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number
  ): Promise<MapReviewDto> {
    return this.reviewService.updateReview(reviewID, userID, body);
  }

  @Delete('/:reviewID')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Allows the submitter'
  })
  @ApiNoContentResponse({ description: 'Review deleted successfully' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({
    description: 'User is not a mod or the submitter of the map review'
  })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  deleteReview(
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number
  ): Promise<void> {
    return this.reviewService.deleteReview(reviewID, userID, false);
  }

  @Get('/:reviewID/comments')
  @ApiOperation({
    summary: 'Get list of review comments. Author user is always included.'
  })
  @ApiOkPagedResponse(MapReviewCommentDto)
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({ description: 'Map is not in submission' })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  getComments(
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @LoggedInUser('id') userID: number,
    @Query() query: PagedQueryDto
  ): Promise<PagedResponseDto<MapReviewCommentDto>> {
    return this.commentService.getComments(reviewID, userID, query);
  }

  // Not bothered with single comment GET, can't imagine every needing it.

  @Post('/:reviewID/comments')
  @ApiOperation({ summary: 'Post a comment on a review' })
  @ApiOkResponse({ type: MapReviewCommentDto })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({ description: 'Map is not in submission' })
  @ApiBody({ type: CreateMapReviewCommentDto })
  @ApiParam({
    name: 'reviewID',
    type: Number,
    description: 'Target Review ID',
    required: true
  })
  postComment(
    @Param('reviewID', ParseIntSafePipe) reviewID: number,
    @Body() body: CreateMapReviewCommentDto,
    @LoggedInUser('id') userID: number
  ): Promise<MapReviewCommentDto> {
    return this.commentService.postComment(reviewID, userID, body);
  }

  @Patch('/comments/:commentID')
  @ApiOperation({ summary: 'Update an existing commment' })
  @ApiOkResponse({ type: MapReviewCommentDto })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Map is not in submission' })
  @ApiForbiddenResponse({ description: 'User is not comment author' })
  @ApiBody({ type: UpdateMapReviewCommentDto })
  @ApiParam({
    name: 'commentID',
    type: Number,
    description: 'Target Comment ID',
    required: true
  })
  updateComment(
    @Param('commentID', ParseIntSafePipe) commentID: number,
    @Body() body: UpdateMapReviewCommentDto,
    @LoggedInUser('id') userID: number
  ): Promise<MapReviewCommentDto> {
    return this.commentService.updateComment(commentID, userID, body);
  }

  @Delete('/comments/:commentID')
  @ApiOperation({ summary: 'Delete an existing commment' })
  @ApiNoContentResponse({ description: 'Comment deleted successfully' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Map is not in submission' })
  @ApiForbiddenResponse({ description: 'User is not comment author' })
  @ApiParam({
    name: 'commentID',
    type: Number,
    description: 'Target Comment ID',
    required: true
  })
  deleteComment(
    @Param('commentID', ParseIntSafePipe) commentID: number,
    @LoggedInUser('id') userID: number
  ): Promise<void> {
    return this.commentService.deleteComment(commentID, userID);
  }
}
