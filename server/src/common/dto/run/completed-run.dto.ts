import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, ValidateNested } from 'class-validator';
import { Transform } from 'class-transformer';
import { DtoFactory } from '@lib/dto.lib';
import { UserMapRankDto } from './user-map-rank.dto';
import { RunDto } from './runs.dto';

export interface XpGain {
    rankXP: number;
    cosXP: {
        gainLvl: number;
        oldXP: number;
        gainXP: number;
    };
}

export class CompletedRunDto {
    @ApiProperty({
        description: 'Whether the run is the new world record for this track',
        type: Boolean
    })
    @IsBoolean()
    isNewWorldRecord: boolean;

    @ApiProperty({
        description: "Whether the run is the player's new personal best for this track",
        type: Boolean
    })
    @IsBoolean()
    isNewPersonalBest: boolean;

    @ApiProperty()
    @ValidateNested()
    @Transform(({ value }) => DtoFactory(UserMapRankDto, value))
    rank: UserMapRankDto;

    @ApiProperty()
    @ValidateNested()
    @Transform(({ value }) => DtoFactory(RunDto, value))
    run: RunDto;

    @ApiProperty()
    xp: XpGain;
}
