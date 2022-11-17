import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, ValidateNested } from 'class-validator';
import { MapType } from '../../enums/map.enum';
import { DtoFactory } from '@lib/dto.lib';
import { MapDto } from './map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from '../run/runs.dto';
import { Transform } from 'class-transformer';

// TODO: naming is weird here
export class MapRankDto implements UserMapRank {
    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty({ type: () => MapDto })
    @Transform(({ value }) => DtoFactory(MapDto, value))
    @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty({ type: () => UserDto })
    @Transform(({ value }) => DtoFactory(UserDto, value))
    @ValidateNested()
    user: UserDto;

    @ApiProperty()
    runID: bigint;

    @ApiProperty()
    @Transform(({ value }) => DtoFactory(RunDto, value))
    @ValidateNested()
    run: RunDto;

    @ApiProperty()
    @IsEnum(MapType)
    gameType: MapType;

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
