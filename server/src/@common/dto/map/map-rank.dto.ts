import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDateString, IsEnum, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { EMapType } from '../../enums/map.enum';
import { DtoUtils } from '../../utils/dto-utils';
import { Transform } from 'class-transformer';
import { MapDto } from './map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from '../run/runs.dto';

export class MapRankDto implements UserMapRank {
    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
    @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty({ type: () => UserDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty()
    runID: bigint;

    @ApiProperty()
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(RunDto, value))
    // TODO: Add back once this is worked on
    // @ValidateNested()
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
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}
