import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt } from 'class-validator';
import { RunDto } from './run.dto';
import { RankDto } from './rank.dto';
import { NestedProperty } from '../../decorators';

class CosXpGain {
  @ApiProperty({ type: Number, description: 'Integer amount of levels gained' })
  @IsInt()
  readonly gainLvl: number;

  @ApiProperty({
    type: Number,
    description: 'Cosmetic XP of player before the run'
  })
  @IsInt()
  readonly oldXP: number;

  @ApiProperty({
    type: Number,
    description: 'Cosmetic XP of player after the run'
  })
  @IsInt()
  readonly gainXP: number;
}

export class XpGainDto {
  @ApiProperty({ type: Number, description: 'New ranked XP of player' })
  @IsInt()
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
    description:
      "Whether the run is the player's new personal best for this track",
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
