import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsInt, IsOptional } from 'class-validator';
import { EMapType } from '../../enums/map.enum';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';
import { MapDto } from './map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from '../run/runs.dto';
import { MapImageDto } from './mapImage.dto';

export class MapRankDto implements UserMapRank {
    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty({ type: () => UserDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    user: UserDto;

    @ApiProperty()
    @IsInt()
    runID: bigint;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(RunDto, value))
    run: RunDto;

    @ApiProperty()
    @IsEnum(EMapType)
    gameType: EMapType;

    @ApiProperty()
    // Not sure what is this, maybe a 0.10.0 thing?
    flags: number;

    @ApiProperty()
    @IsInt()
    trackNum: number;

    @ApiProperty()
    @IsInt()
    zoneNum: number;

    @ApiProperty()
    @IsInt()
    rank: number;

    @ApiProperty()
    @IsInt()
    rankXP: number;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;
}
