import { MapZone } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsInt, IsPositive, Max } from 'class-validator';
import { MapZoneTriggerDto } from './map-zone-trigger.dto';
import { NestedDto } from '@lib/dto.lib';
import { MapZoneStatsDto } from './map-zone-stats.dto';
import { UserDto } from '@common/dto/user/user.dto';

export class MapZoneDto implements MapZone {
    @Exclude()
    id: number;

    @ApiProperty()
    @IsInt()
    @Max(64)
    zoneNum: number;

    @IdProperty()
    trackID: number;

    @NestedDto(MapZoneStatsDto, { isArray: true })
    stats: MapZoneStatsDto[];

    @NestedDto(MapZoneTriggerDto, { isArray: true })
    triggers: MapZoneTriggerDto[];

    @Exclude()
    createdAt: Date;

    @Exclude()
    updatedAt: Date;
}

export class CreateMapZoneDto extends PickType(MapZoneDto, ['zoneNum'] as const) {
    @NestedDto(MapZoneTriggerDto, { type: () => UserDto, isArray: true })
    @ArrayMinSize(1)
    triggers: MapZoneTriggerDto[];

    // Old api also has a stats object just containing a basestats, I'm unsure why.
}
