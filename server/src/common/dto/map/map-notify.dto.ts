import { ApiProperty, PickType } from '@nestjs/swagger';
import { MapNotify } from '@prisma/client';
import { Exclude } from 'class-transformer';

export class MapNotifyDto implements MapNotify {
    @ApiProperty()
    notifyOn: number;

    @ApiProperty()
    mapID: number;

    @ApiProperty()
    userID: number;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

export class UpdateMapNotifyDto extends PickType(MapNotifyDto, ['notifyOn'] as const) {}
