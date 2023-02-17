import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsHash, IsInt, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { MapDto } from '../map/map.dto';
import { NestedDtoOptional } from '@lib/dto.lib';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { RunZoneStatsDto } from './run-zone-stats.dto';
import { IsPositiveNumberString } from '@common/validators/is-positive-number-string.validator';

// TODO: BaseStatsDTO, various other nested DTOs
export class RunDto implements PrismaModelToDto<Run> {
    @IdProperty({ bigint: true })
    id: number;

    @ApiProperty({
        type: Number,
        description: 'The overall time of the run (ticks * tickRate)'
    })
    @IsNumber()
    time: number;

    @ApiProperty({
        type: Number,
        description: 'The track the run took place on'
    })
    @IsPositive()
    trackNum: number;

    @ApiProperty({
        type: Number,
        description: 'The number of zones in the run'
    })
    @IsInt()
    zoneNum: number;

    @ApiProperty({
        type: Number,
        description: 'The total ticks'
    })
    @IsInt()
    ticks: number;

    @ApiProperty()
    @IsNumber()
    tickRate: number;

    @ApiProperty()
    @IsInt()
    flags: number;

    @ApiProperty()
    @IsString()
    file: string;

    @ApiProperty()
    @IsHash('sha1')
    @IsOptional()
    hash: string;

    @IdProperty({ required: false, bigint: true })
    overallStatsID: number;

    @NestedProperty(BaseStatsDto, { required: false })
    overallStats: BaseStatsDto;

    @ApiProperty()
    @IsPositive()
    userID: number;

    @NestedProperty(UserDto, { required: false, lazy: true })
    user: UserDto;

    @IdProperty()
    mapID: number;

    @NestedProperty(MapDto, { required: false })
    map: MapDto;

    @NestedProperty(MapRankDto, { required: false, lazy: true })
    rank: MapRankDto;

    @NestedProperty(RunZoneStatsDto, { required: false, lazy: true, isArray: true })
    zoneStats: RunZoneStatsDto[];

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}
