import { ApiProperty, PickType } from '@nestjs/swagger';
import { MapNotify } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsPositive } from 'class-validator';

export class MapNotifyDto implements MapNotify {
    @ApiProperty()
    @IsPositive()
    notifyOn: number;

    @Exclude()
    mapID: number;

    @ApiProperty()
    @IsPositive()
    userID: number;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

export class UpdateMapNotifyDto extends PickType(MapNotifyDto, ['notifyOn'] as const) {}
