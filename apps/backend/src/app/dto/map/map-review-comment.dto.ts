import { IsString, MaxLength } from 'class-validator';
import { CreatedAtProperty, IdProperty, NestedProperty } from '../decorators';
import { UserDto } from '../user/user.dto';
import {
  CreateMapReviewComment,
  DateString,
  MapReviewComment,
  MAX_REVIEW_COMMENT_LENGTH,
  UpdateMapReviewComment
} from '@momentum/constants';
import { PickType } from '@nestjs/swagger';

export class MapReviewCommentDto implements MapReviewComment {
  @IdProperty()
  readonly id: number;

  @IdProperty()
  readonly reviewID: number;

  @IsString()
  @MaxLength(MAX_REVIEW_COMMENT_LENGTH)
  readonly text: string;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: DateString;

  @CreatedAtProperty()
  readonly updatedAt: DateString;
}

export class CreateMapReviewCommentDto
  extends PickType(MapReviewCommentDto, ['text'] as const)
  implements CreateMapReviewComment {}

export class UpdateMapReviewCommentDto
  extends CreateMapReviewCommentDto
  implements UpdateMapReviewComment {}
