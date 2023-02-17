import { MapTrack } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsPositive, Max } from 'class-validator';
import { CreateMapZoneDto, MapZoneDto } from './zone/map-zone.dto';
import { NestedDto } from '@lib/dto.lib';

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

    @NestedDto(MapZoneDto, { isArray: true })
    zones: MapZoneDto[];

    @Exclude()
    mapID: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class CreateMapTrackDto extends PickType(MapTrackDto, [
    'trackNum',
    'isLinear',
    'numZones',
    'difficulty'
] as const) {
    @NestedDto(CreateMapZoneDto, { isArray: true })
    @IsArray()
    @ArrayMinSize(2)
    zones: CreateMapZoneDto[];
}
