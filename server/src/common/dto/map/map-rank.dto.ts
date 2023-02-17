import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsPositive } from 'class-validator';
import { MapType } from '../../enums/map.enum';
import { NestedDto } from '@lib/dto.lib';
import { MapDto } from './map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from '../run/runs.dto';
import { Type } from 'class-transformer';

// TODO: naming is weird here
export class MapRankDto implements PrismaModelToDto<UserMapRank> {
    @IdProperty()
    mapID: number;

    @NestedProperty(MapDto, { lazy: true })
    map: MapDto;

    @IdProperty()
    userID: number;

    @NestedProperty(UserDto, { lazy: true })
    user: UserDto;

    @IdProperty({ bigint: true })
    runID: number;

    @NestedProperty(RunDto)
    run: RunDto;

    @EnumProperty(MapType)
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
    @IsPositive()
    rank: number;

    @ApiProperty()
    @IsInt()
    rankXP: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}
