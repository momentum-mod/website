import { MapTrack } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsInt, IsPositive, Max } from 'class-validator';
import { CreateMapZoneDto, MapZoneDto } from './zone/map-zone.dto';
import { CreatedAtProperty, IdProperty, NestedProperty, UpdatedAtProperty } from '@lib/dto.lib';

export class MapTrackDto implements MapTrack {
    @IdProperty()
    id: number;

    @ApiProperty()
    @IsInt()
    @Max(64)
    trackNum: number;

    @ApiProperty()
    @IsPositive()
    @Max(64)
    numZones: number;

    @ApiProperty()
    @IsBoolean()
    isLinear: boolean;

    @ApiProperty()
    @IsPositive()
    @Max(10)
    difficulty: number;

    @NestedProperty(MapZoneDto, { isArray: true })
    zones: MapZoneDto[];

    @Exclude()
    mapID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}

export class CreateMapTrackDto extends PickType(MapTrackDto, [
    'trackNum',
    'isLinear',
    'numZones',
    'difficulty'
] as const) {
    @NestedProperty(CreateMapZoneDto, { isArray: true })
    @IsArray()
    @ArrayMinSize(2)
    zones: CreateMapZoneDto[];
}
