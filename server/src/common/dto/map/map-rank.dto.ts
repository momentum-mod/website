import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt } from 'class-validator';
import { MapType } from '../../enums/map.enum';
import { NestedDto } from '@lib/dto.lib';
import { MapDto } from './map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from '../run/runs.dto';

// TODO: naming is weird here
export class MapRankDto implements UserMapRank {
    @ApiProperty()
    @IsInt()
    mapID: number;

    @NestedDto(MapDto, { type: () => MapDto })
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @NestedDto(UserDto, { type: () => UserDto })
    user: UserDto;

    @ApiProperty()
    runID: bigint;

    @NestedDto(RunDto)
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
