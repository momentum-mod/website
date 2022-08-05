import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsDefined, IsInt, ValidateNested } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { DtoFactory } from '../../utils/dto.utility';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { RunZoneStatsDto } from './run-zone-stats.dto';

// TODO: BaseStatsDTO, various other nested DTOs

export class RunDto implements Run {
    @ApiProperty({
        type: Number,
        description: 'The ID of the run'
    })
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

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(BaseStatsDto, value))
    @ValidateNested()
    overallStats: BaseStatsDto;

    @ApiProperty({ type: () => RunZoneStatsDto })
    @Transform(({ value }) => value?.map((x) => DtoFactory(RunZoneStatsDto, x)))
    @ValidateNested()
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

    @ApiProperty({ type: () => UserDto })
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty({ type: () => MapRankDto })
    @Transform(({ value }) => DtoFactory(MapRankDto, value))
    @ValidateNested()
    rank: MapRankDto;

    @ApiProperty()
    @IsDefined()
    @IsInt()
    mapID: number;

    @ApiProperty({ type: () => MapDto })
    @Transform(({ value }) => DtoFactory(MapDto, value))
    @ValidateNested()
    map: MapDto;
}
