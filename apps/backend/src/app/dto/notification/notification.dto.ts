import { Notification, NotificationType } from '@momentum/constants';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../decorators';
import { UserDto } from '../user/user.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MapDto } from '../map/map.dto';
import { PastRunDto } from '../run/past-run.dto';
import { MapReviewDto } from '../map/map-review.dto';

export class NotificationDto implements Notification {
  @IdProperty()
  readonly id: number;

  @EnumProperty(NotificationType)
  readonly type: NotificationType;

  @IdProperty({
    description: 'The ID of the user that the notification is sent to'
  })
  readonly targetUserID: number;

  @NestedProperty(UserDto)
  readonly targetUser: UserDto;

  @ApiProperty({ description: 'The text of the announcement notification' })
  @IsString()
  @IsOptional()
  readonly message: string;

  @IdProperty({
    description:
      'The ID of the user that achieved the wr or sent the map testing request'
  })
  @IsOptional()
  readonly userID: number;

  @NestedProperty(UserDto)
  @IsOptional()
  readonly user: UserDto;

  @IdProperty({
    description:
      'The ID of the map that the testing request is about or the map that changed status'
  })
  @IsOptional()
  readonly mapID: number;

  @NestedProperty(MapDto)
  @IsOptional()
  readonly map: MapDto;

  @IdProperty({
    description: 'The ID of the PastRun that has just been achieved'
  })
  @IsOptional()
  readonly runID: bigint;

  @NestedProperty(PastRunDto)
  @IsOptional()
  readonly run: PastRunDto;

  @IdProperty({
    description: 'The ID of the MapReview that has just been posted'
  })
  @IsOptional()
  readonly reviewID: number;

  @NestedProperty(MapReviewDto)
  @IsOptional()
  readonly review: MapReviewDto;

  @CreatedAtProperty()
  readonly createdAt: Date;
}
