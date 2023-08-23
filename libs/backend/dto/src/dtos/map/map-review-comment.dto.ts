import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty
} from '../../decorators';
import { IsString } from 'class-validator';
import { UserDto } from '../user/user.dto';

export class MapReviewCommentDto {
  @IdProperty()
  readonly id: number;

  @IsString()
  readonly text: string;

  @NestedProperty(UserDto, { lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;
}
