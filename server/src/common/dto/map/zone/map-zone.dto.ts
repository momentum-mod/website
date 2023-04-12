import { MapZone } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsInt, Max } from 'class-validator';
import { MapZoneTriggerDto } from './map-zone-trigger.dto';
import { IdProperty, NestedProperty } from '@lib/dto.lib';
import { MapZoneStatsDto } from './map-zone-stats.dto';

export class MapZoneDto implements MapZone {
    @Exclude()
    readonly id: number;

    @ApiProperty()
    @IsInt()
    @Max(64)
    readonly zoneNum: number;

    @IdProperty()
    readonly trackID: number;

    @NestedProperty(MapZoneStatsDto, { isArray: true })
    readonly stats: MapZoneStatsDto[];

    @NestedProperty(MapZoneTriggerDto, { isArray: true })
    readonly triggers: MapZoneTriggerDto[];

    @Exclude()
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}

export class CreateMapZoneDto extends PickType(MapZoneDto, ['zoneNum'] as const) {
    @NestedProperty(MapZoneTriggerDto, { lazy: true, isArray: true })
    @ArrayMinSize(1)
    readonly triggers: MapZoneTriggerDto[];

    // Old api also has a stats object just containing a basestats, I'm unsure why.
}
