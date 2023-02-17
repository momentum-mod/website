import { User, UserMapRank, Map as MapDB } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive } from 'class-validator';
import { CreatedAtProperty, IdProperty, NestedProperty, PrismaModelToDto, UpdatedAtProperty } from '@lib/dto.lib';
import { RunDto } from './runs.dto';
import { UserDto } from '../user/user.dto';
import { MapDto } from '../map/map.dto';

export class UserMapRankDto implements PrismaModelToDto<UserMapRank> {
    @ApiProperty({ description: 'The gamemode of the run' })
    @IsInt()
    gameType: number;

    @ApiProperty({ description: 'Unimplemented' })
    @IsInt()
    flags: number;

    @ApiProperty({ description: 'The track the run is on' })
    @IsInt()
    trackNum: number;

    @ApiProperty({ description: 'The zone the run is on. > 0 is a IL run, not yet supported' })
    @IsInt()
    zoneNum: number;

    @ApiProperty({ description: 'The leaderboard rank of the run' })
    @IsInt()
    rank: number;

    @ApiProperty({ description: 'The ranked XP assigned for the run' })
    @IsNumber()
    rankXP: number;

    @NestedProperty(MapDto)
    map: MapDB;

    @ApiProperty()
    @IsInt()
    mapID: number;

    @NestedProperty(UserDto)
    user: User;

    @ApiProperty()
    @IsPositive()
    userID: number;

    @NestedProperty(RunDto)
    run: RunDto;

    @IdProperty({ bigint: true })
    runID: number;

    @CreatedAtProperty()
    createdAt: Date;

    @UpdatedAtProperty()
    updatedAt: Date;
}
