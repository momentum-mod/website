import { ApiProperty, PickType } from '@nestjs/swagger';
import { MapNotify } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsPositive } from 'class-validator';

export class MapNotifyDto implements MapNotify {
    @EnumProperty(ActivityTypes)
    notifyOn: ActivityTypes;

    @IdProperty()
    mapID: number;

    @IdProperty()
    userID: number;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

export class UpdateMapNotifyDto extends PickType(MapNotifyDto, ['notifyOn'] as const) {}
