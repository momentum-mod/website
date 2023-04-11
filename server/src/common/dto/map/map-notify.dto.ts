import { PickType } from '@nestjs/swagger';
import { MapNotify } from '@prisma/client';
import { ActivityType } from '@common/enums/activity.enum';
import { CreatedAtProperty, IdProperty, EnumProperty, UpdatedAtProperty } from '@lib/dto.lib';

export class MapNotifyDto implements MapNotify {
    @EnumProperty(ActivityType)
    notifyOn: ActivityType;

    @IdProperty()
    mapID: number;

    @IdProperty()
    userID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

export class UpdateMapNotifyDto extends PickType(MapNotifyDto, ['notifyOn'] as const) {}
