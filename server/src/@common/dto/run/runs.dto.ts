import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/mapRank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsInt, IsOptional } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { DtoUtils } from '../../utils/dto-utils';

export class RunDto implements Run {
    @ApiProperty()
    id: bigint;

    @ApiProperty()
    @Expose()
    get time(): number {
        return this.ticks * this.tickRate;
    }

    @ApiProperty()
    @IsInt()
    trackNum: number;

    @ApiProperty()
    @IsInt()
    zoneNum: number;

    @ApiProperty()
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

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    player: UserDto;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapRankDto, value))
    rank: MapRankDto;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
    map: MapDto;
}
