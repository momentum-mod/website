import { ActivityType, DateString } from '@momentum/constants';
import { MapNotify, UpdateMapNotify } from '@momentum/constants';
import { PickType } from '@nestjs/swagger';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  UpdatedAtProperty
} from '../decorators';

export class MapNotifyDto implements MapNotify {
  @EnumProperty(ActivityType)
  readonly notifyOn: ActivityType;

  @IdProperty()
  readonly mapID: number;

  @IdProperty()
  readonly userID: number;

  @CreatedAtProperty()
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}

export class UpdateMapNotifyDto
  extends PickType(MapNotifyDto, ['notifyOn'] as const)
  implements UpdateMapNotify {}
