import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { UserMapRankDto } from './user-map-rank.dto';
import { RunDto } from './runs.dto';

class CosXpGain {
    @IsNumber()
    gainLvl: number;

    @IsNumber()
    oldXP: number;

    @IsNumber()
    gainXP: number;
}

export class XpGainDto {
    @IsNumber()
    rankXP: number;

    @NestedProperty(CosXpGain)
    cosXP: CosXpGain;
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

    @NestedProperty(UserMapRankDto)
    rank: UserMapRankDto;

    @NestedProperty(RunDto)
    run: RunDto;

    @NestedProperty(XpGainDto)
    xp: XpGainDto;
}
