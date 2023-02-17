import { MapZoneTrigger, Prisma } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { IsInt, IsJSON, IsNumber, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MapZoneTriggerPropertiesDto } from './map-zone-trigger-properties.dto';
import { NestedProperty } from '@lib/dto.lib';

export class MapZoneTriggerDto implements MapZoneTrigger {
    @Exclude()
    id: number;

    // Old api says this is int 0-4, probs start/end/cp/stage/?
    @ApiProperty()
    @IsInt()
    @Max(4)
    type: number;

    @ApiProperty()
    @IsNumber()
    pointsHeight: number;

    @ApiProperty()
    pointsZPos: number;

    @ApiProperty()
    @IsJSON()
    // TODO: Should have max 32 values and match /p\d+/
    points: Prisma.JsonValue;

    @NestedProperty(MapZoneTriggerPropertiesDto, { required: false })
    properties?: MapZoneTriggerPropertiesDto;

    @Exclude()
    zoneID: number;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}
