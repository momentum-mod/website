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
}
