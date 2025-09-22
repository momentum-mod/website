import {
  AbstractNotification,
  AnnouncementNotification,
  DateString,
  LeaderboardRun,
  MapReview,
  MapReviewComment,
  MapReviewCommentPostedNotification,
  MapReviewPostedNotification,
  MapStatus,
  MapStatusChangeNotification,
  MapTestingInviteNotification,
  MMap,
  NotificationType,
  User,
  WRAchievedNotification
} from '@momentum/constants';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../decorators';
import { IsBoolean, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MapDto } from '../map/map.dto';
import { LeaderboardRunDto } from '../run/leaderboard-run.dto';
import { UserDto } from '../user/user.dto';
import { MapReviewDto } from '../map/map-review.dto';
import { MapReviewCommentDto } from '../map/map-review-comment.dto';

export class NotificationDto<T = NotificationType>
  implements AbstractNotification<T>
{
  @IdProperty()
  readonly id: number;

  @EnumProperty(NotificationType, {
    description:
      'Determines which notification variation it is. ' +
      'Used for determining which accompanying data fields exist'
  })
  readonly type: T;

  @ApiProperty({
    description: 'Whether the user has seen (read) the notification'
  })
  @IsBoolean()
  readonly isRead: boolean;

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

export class AnnouncementNotificationDto
  extends NotificationDto<NotificationType.ANNOUNCEMENT>
  implements AnnouncementNotification
{
  @ApiProperty()
  @IsString()
  readonly message: string;
}

export class WRAchievedNotificationDto
  extends NotificationDto<NotificationType.WR_ACHIEVED>
  implements WRAchievedNotification
{
  @NestedProperty(MapDto, { lazy: true })
  readonly map: MMap;

  @NestedProperty(LeaderboardRunDto, { lazy: true })
  readonly run: LeaderboardRun;
}

export class MapStatusChangeNotificationDto
  extends NotificationDto<NotificationType.MAP_STATUS_CHANGE>
  implements MapStatusChangeNotification
{
  @EnumProperty(MapStatus)
  readonly oldStatus: MapStatus;

  @EnumProperty(MapStatus)
  readonly newStatus: MapStatus;

  @NestedProperty(MapDto, { lazy: true })
  readonly map: MMap;

  @NestedProperty(UserDto, { lazy: true })
  readonly changedBy: User;
}

export class MapTestingInviteNotificationDto
  extends NotificationDto<NotificationType.MAP_TESTING_INVITE>
  implements MapTestingInviteNotification
{
  @NestedProperty(MapDto, { lazy: true })
  readonly map: MMap;

  @NestedProperty(UserDto, { lazy: true })
  readonly invitedBy: User;
}

export class MapReviewPostedNotificationDto
  extends NotificationDto<NotificationType.MAP_REVIEW_POSTED>
  implements MapReviewPostedNotification
{
  @NestedProperty(MapDto, { lazy: true })
  readonly map: MMap;

  @NestedProperty(MapReviewDto, { lazy: true })
  readonly review: MapReview;

  @NestedProperty(UserDto, { lazy: true })
  readonly reviewer: User;
}

export class MapReviewCommentPostedNotificationDto
  extends NotificationDto<NotificationType.MAP_REVIEW_COMMENT_POSTED>
  implements MapReviewCommentPostedNotification
{
  @NestedProperty(MapDto, { lazy: true })
  readonly map: MMap;

  @NestedProperty(MapReviewDto, { lazy: true })
  readonly review: MapReview;

  @NestedProperty(MapReviewCommentDto, { lazy: true })
  readonly reviewComment: MapReviewComment;

  @NestedProperty(UserDto, { lazy: true })
  readonly reviewCommenter: User;
}
