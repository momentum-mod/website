import { IsString } from 'class-validator';
import { CreatedAtProperty, IdProperty, NestedProperty } from '../decorators';
import { UserDto } from '../user/user.dto';
import { MapReviewComment } from '@momentum/constants';

export class MapReviewCommentDto implements MapReviewComment {
  @IdProperty()
  readonly id: number;

  @IdProperty()
  readonly reviewID: number;

  @IsString()
  readonly text: string;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @CreatedAtProperty()
  readonly updatedAt: Date;
}
