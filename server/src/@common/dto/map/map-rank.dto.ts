import { UserMapRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { MapType } from '../../enums/map.enum';
import { DtoTransform } from '../../utils/dto-utils';
import { MapDto } from './map.dto';
import { UserDto } from '../user/user.dto';
import { RunDto } from '../run/runs.dto';

export class MapRankDto implements UserMapRank {
    @ApiProperty()
    @IsInt()
    mapID: number;

    @ApiProperty()
    @IsOptional()
    @DtoTransform(MapDto)
    @ValidateNested()
    map: MapDto;

    @ApiProperty()
    @IsInt()
    userID: number;

    @ApiProperty({ type: () => UserDto })
    @IsOptional()
    @DtoTransform(UserDto)
    @ValidateNested()
    user: UserDto;

    @ApiProperty()
    runID: bigint;

    @ApiProperty()
    @IsOptional()
    @DtoTransform(RunDto)
    // TODO: Add back once this is worked on
    // @ValidateNested()
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
