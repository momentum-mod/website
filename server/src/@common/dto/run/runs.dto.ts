import { UserDto } from '../user/user.dto';
import { MapRankDto } from '../map/map-rank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsDateString, IsDefined, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { DtoUtils } from '../../utils/dto-utils';

// TODO: BaseStatsDTO, various other nested DTOs

export class RunDto implements Run {
    @ApiProperty({
        type: Number,
        description: 'The ID of the run'
    })
    @IsDefined()
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
    @IsDefined()
    @IsInt()
    trackNum: number;

    @ApiProperty({
        type: Number,
        description: 'The number of zones in the run'
    })
    @IsDefined()
    @IsInt()
    zoneNum: number;

    @ApiProperty({
        type: Number,
        description: 'The total ticks'
    })
    @IsDefined()
    @IsInt()
    ticks: number;

    // TODO: I assume these will be improved in future
    @ApiProperty()
    tickRate: number;

    @ApiProperty()
    flags: number;

    @ApiProperty()
    file: string;

    @ApiProperty()
    hash: string;

    @ApiProperty()
    baseStatsID: bigint;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;

    @ApiProperty()
    @IsDefined()
    @IsInt()
    playerID: number;

    @ApiProperty({ type: () => UserDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(UserDto, value))
    @ValidateNested()
    player: UserDto;

    @ApiProperty({ type: () => MapRankDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapRankDto, value))
    @ValidateNested()
    rank: MapRankDto;

    @ApiProperty()
    @IsDefined()
    @IsInt()
    mapID: number;

    @ApiProperty({ type: () => MapDto })
    @IsOptional()
    @Transform(({ value }) => DtoUtils.Factory(MapDto, value))
    // TODO: Add back once this is worked on
    // @ValidateNested()
    map: MapDto;
}
