import { MapZone } from '@prisma/client';
import { Exclude, Transform, Type } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsInt, Max, ValidateNested } from 'class-validator';
import { MapZoneTriggerDto } from './map-zone-trigger.dto';
import { DtoFactory } from '../../../utils/dto.utility';
import { MapZoneStatsDto } from './map-zone-stats.dto';

export class MapZoneDto implements MapZone {
    @Exclude()
    id: number;

    @ApiProperty()
    @IsInt()
    @Max(64)
    zoneNum: number;

    @ApiProperty()
    @IsInt()
    trackID: number;

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapZoneStatsDto, x)))
    @ValidateNested()
    stats: MapZoneStatsDto[];

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapZoneTriggerDto, x)))
    @ValidateNested()
    triggers: MapZoneTriggerDto[];

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

export class CreateMapZoneDto extends PickType(MapZoneDto, ['zoneNum'] as const) {
    @ApiProperty()
    @Type(() => MapZoneTriggerDto)
    @ValidateNested()
    @ArrayMinSize(1)
    triggers: MapZoneTriggerDto[];

    // Old api also has a stats object just containing a basestats, I'm unsure why.
}
