import { MapZoneTrigger, MapZoneTriggerProperties, Prisma } from '@prisma/client';
import { Exclude, Transform } from 'class-transformer';
import { IsInt, IsJSON, Max, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MapZoneTriggerPropertiesDto } from './map-zone-trigger-properties.dto';
import { DtoFactory } from '../../../utils/dto.utility';

export class MapZoneTriggerDto implements MapZoneTrigger {
    @Exclude()
    id: number;

    // Old api says this is int 0-4, probs start/end/cp/stage/?
    @ApiProperty()
    @IsInt()
    @Max(4)
    type: number;

    @ApiProperty()
    pointsHeight: number;

    @ApiProperty()
    pointsZPos: number;

    @ApiProperty()
    @IsJSON()
    // TODO: Should have max 32 values and match /p\d+/
    points: Prisma.JsonValue;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(MapZoneTriggerPropertiesDto, value))
    @ValidateNested()
    properties: MapZoneTriggerPropertiesDto;

    @Exclude()
    zoneID: number;

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}
