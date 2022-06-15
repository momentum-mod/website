import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsInt, IsOptional } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { DtoUtils } from '../../utils/dto-utils';

// TODO: BaseStatsDTO, various other nested DTOs

export class RunDto implements Run {
    @ApiProperty({
        type: Number,
        description: 'The ID of the run'
    })
    id: bigint;

    @ApiProperty({
        type: Number,
        description: 'The overall time of the run (ticks * tickRate)'
    })
    @Expose()
    get time(): number {
        return this.ticks * this.tickRate;
    }

    @ApiProperty({
        type: Number,
        description: 'The track the run took place on'
    })
    @IsInt()
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
    tickRate: number;

    @ApiProperty()
    flags: number;

    @ApiProperty()
    file: string;

    @ApiProperty()
    hash: string;

    @ApiProperty()
    @IsInt()
    baseStatsID: bigint;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;

    @ApiProperty()
    @IsInt()
    playerID: number;

    @ApiProperty({ type: () => UserDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    player: UserDto;

    @ApiProperty({ type: () => MapRankDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapRankDto, value))
    rank: MapRankDto;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty({ type: () => MapDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
    map: MapDto;
}
