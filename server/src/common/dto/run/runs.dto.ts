import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsDefined, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { NestedDto } from '@lib/dto.lib';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { RunZoneStatsDto } from './run-zone-stats.dto';

// TODO: BaseStatsDTO, various other nested DTOs

export class RunDto implements Run {
    @ApiProperty({
        type: String,
        description: 'The ID of the run'
    })
    @Transform(({ value }) => BigInt(value))
    @IsDefined()
    id: bigint;

    @ApiProperty({
        type: Number,
        description: 'The overall time of the run (ticks * tickRate)'
    })
    @IsDefined()
    time: number;

    @ApiProperty({
        type: Number,
        description: 'The track the run took place on'
    })
    @IsDefined()
    @IsInt()
    trackNum: number;

    @ApiProperty({
        type: Number,
        description: 'The number of zones in the run'
    })
    @IsDefined()
    @IsInt()
    zoneNum: number;

    @ApiProperty({
        type: Number,
        description: 'The total ticks'
    })
    @IsDefined()
    @IsInt()
    ticks: number;

    // TODO: I assume these will be improved in future
    @ApiProperty()
    tickRate: number;

    @ApiProperty()
    flags: number;

    @ApiProperty()
    file: string;

    @ApiProperty()
    hash: string;

    @NestedDto(BaseStatsDto)
    overallStats: BaseStatsDto;

    @NestedDto(RunZoneStatsDto, { type: () => RunZoneStatsDto, isArray: true })
    zoneStats: RunZoneStatsDto[];

    @ApiProperty()
    overallStatsID: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;

    @ApiProperty()
    @IsDefined()
    @IsInt()
    userID: number;

    @NestedDto(UserDto, { type: () => UserDto })
    user: UserDto;

    @NestedDto(MapRankDto, { type: () => MapRankDto })
    rank: MapRankDto;

    @ApiProperty()
    @IsDefined()
    @IsInt()
    mapID: number;

    @NestedDto(MapDto)
    map: MapDto;
}
