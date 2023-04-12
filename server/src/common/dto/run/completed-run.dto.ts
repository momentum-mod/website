import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber } from 'class-validator';
import { NestedProperty } from '@lib/dto.lib';
import { RunDto } from './run.dto';
import { RankDto } from '@common/dto/run/rank.dto';

class CosXpGain {
    @ApiProperty({ type: Number, description: 'Integer amount of levels gained' })
    @IsInt()
    readonly gainLvl: number;

    // TODO: Are these two ints or floats? Don't seem like they're being rounded, but lets verify.
    @ApiProperty({ type: Number, description: 'Cosmetic XP of player before the run' })
    @IsNumber()
    readonly oldXP: number;

    @ApiProperty({ type: Number, description: 'Cosmetic XP of player after the run' })
    @IsNumber()
    readonly gainXP: number;
}

export class XpGainDto {
    @ApiProperty({ type: Number, description: 'New ranked XP of player' })
    @IsNumber()
    readonly rankXP: number;

    @NestedProperty(CosXpGain)
    readonly cosXP: CosXpGain;
}

export class CompletedRunDto {
    @ApiProperty({
        description: 'Whether the run is the new world record for this track',
        type: Boolean
    })
    @IsBoolean()
    readonly isNewWorldRecord: boolean;

    @ApiProperty({
        description: "Whether the run is the player's new personal best for this track",
        type: Boolean
    })
    @IsBoolean()
    readonly isNewPersonalBest: boolean;

    @NestedProperty(RankDto)
    readonly rank: RankDto;

    @NestedProperty(RunDto)
    readonly run: RunDto;

    @NestedProperty(XpGainDto)
    readonly xp: XpGainDto;
}
