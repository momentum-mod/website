import { MapZoneTrigger, Prisma } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsInt, IsJSON, IsNumber, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MapZoneTriggerPropertiesDto } from './map-zone-trigger-properties.dto';
import { NestedProperty } from '@lib/dto.lib';

export class MapZoneTriggerDto implements MapZoneTrigger {
    @Exclude()
    readonly id: number;

    // Old api says this is int 0-4, probs start/end/cp/stage/?
    @ApiProperty()
    @IsInt()
    @Max(4)
    readonly type: number;

    @ApiProperty()
    @IsNumber()
    readonly pointsHeight: number;

    @ApiProperty()
    readonly pointsZPos: number;

    @ApiProperty()
    @IsJSON()
    // TODO_0.10: Validate these. On current zone system, should have max 32 values and match /p\d+/
    readonly points: Prisma.JsonValue;

    @NestedProperty(MapZoneTriggerPropertiesDto, { required: false })
    readonly properties?: MapZoneTriggerPropertiesDto;

    @Exclude()
    readonly zoneID: number;

    @Exclude()
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
