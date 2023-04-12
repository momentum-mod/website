import { PickType } from '@nestjs/swagger';
import { MapNotify } from '@prisma/client';
import { ActivityType } from '@common/enums/activity.enum';
import { CreatedAtProperty, IdProperty, EnumProperty, UpdatedAtProperty } from '@lib/dto.lib';

export class MapNotifyDto implements MapNotify {
    @EnumProperty(ActivityType)
    readonly notifyOn: ActivityType;

    @IdProperty()
    readonly mapID: number;

    @IdProperty()
    readonly userID: number;

    @CreatedAtProperty()
    readonly createdAt: Date;

    @UpdatedAtProperty()
    readonly updatedAt: Date;
}

export class UpdateMapNotifyDto extends PickType(MapNotifyDto, ['notifyOn'] as const) {}
