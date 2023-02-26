import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { MapType } from '../../enums/map.enum';
import {
    CreatedAtProperty,
    EnumProperty,
    IdProperty,
    NestedProperty,
    PrismaModelToDto,
    UpdatedAtProperty
} from '@lib/dto.lib';
import { MapDto } from '../map/map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from './run.dto';

export class UserMapRankDto implements PrismaModelToDto<UserMapRank> {
    @IdProperty()
    id: number;

    @EnumProperty(MapType)
    gameType: MapType;

    @ApiProperty({ description: 'Unimplemented' })
    flags: number;

    // TODO_POST_REWRITE: We can remove this and zoneNum in the future since DB no longer stores dupes of this and zoneNum, but
    // still expect a DTO with this structure seem to use it from here.
    @ApiProperty({ description: 'The track the run is on' })
    @IsInt()
    @IsOptional()
    trackNum: number;

    @ApiProperty({ description: 'The zone the run is on. > 0 is a IL run, not yet supported' })
    @IsInt()
    @IsOptional()
    zoneNum: number;

    @ApiProperty({ description: 'The leaderboard rank of the run' })
    @IsPositive()
    rank: number;

    @ApiProperty({ description: 'The ranked XP assigned for the run' })
    @IsInt()
    rankXP: number;

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

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}
