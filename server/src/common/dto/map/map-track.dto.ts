import { MapTrack } from '@prisma/client';
import { Exclude, Transform, Type } from 'class-transformer';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, Max, ValidateNested } from 'class-validator';
import { CreateMapZoneDto, MapZoneDto } from './zone/map-zone.dto';
import { DtoFactory } from '@lib/dto.lib';

export class MapTrackDto implements MapTrack {
    @Exclude()
    id: number;

    @ApiProperty()
    @IsInt()
    @Max(64)
    trackNum: number;

    @ApiProperty()
    @IsInt()
    @Max(64)
    numZones: number;

    @ApiProperty()
    @IsBoolean()
    isLinear: boolean;

    @ApiProperty()
    @IsInt()
    @Max(10)
    difficulty: number;

    @ApiProperty()
    @Transform(({ value }) => value?.map((x) => DtoFactory(MapZoneDto, x)))
    @ValidateNested()
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
    @ApiProperty()
    @Type(() => CreateMapZoneDto)
    @ValidateNested()
    @IsArray()
    @ArrayMinSize(2)
    zones: CreateMapZoneDto[];
}
