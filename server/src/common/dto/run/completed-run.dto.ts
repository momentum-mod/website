import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber } from 'class-validator';
import { NestedProperty } from '@lib/dto.lib';
import { UserMapRankDto } from './user-map-rank.dto';
import { RunDto } from './runs.dto';

class CosXpGain {
    @ApiProperty({ type: Number, description: 'Integer amount of levels gained' })
    @IsInt()
    gainLvl: number;

    // TODO: Are these two ints or floats? Don't seem like they're being rounded, but lets verify.
    @ApiProperty({ type: Number, description: 'Cosmetic XP of player before the run' })
    @IsNumber()
    oldXP: number;

    @ApiProperty({ type: Number, description: 'Cosmetic XP of player after the run' })
    @IsNumber()
    gainXP: number;
}

export class XpGainDto {
    @ApiProperty({ type: Number, description: 'New ranked XP of player' })
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
