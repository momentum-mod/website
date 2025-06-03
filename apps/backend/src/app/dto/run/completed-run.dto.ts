import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt } from 'class-validator';
import { CompletedRun, XpGain } from '@momentum/constants';
import { NestedProperty } from '../decorators';
import { LeaderboardRunDto } from './leaderboard-run.dto';

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

export class XpGainDto implements XpGain {
  @ApiProperty({ type: Number, description: 'New ranked XP of player' })
  @IsInt()
  readonly rankXP: number;

  @NestedProperty(CosXpGain)
  readonly cosXP: CosXpGain;
}

export class CompletedRunDto implements CompletedRun {
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

  @NestedProperty(LeaderboardRunDto)
  readonly run: LeaderboardRunDto;

  @NestedProperty(XpGainDto)
  readonly xp: XpGainDto;

  @ApiProperty({
    description: 'Total runs on the leaderboard, including the submitted run'
  })
  @IsInt()
  readonly totalRuns: number;

  @NestedProperty(LeaderboardRunDto, {
    required: false,
    description: 'The last personal best run of the player, if any'
  })
  readonly lastPB?: LeaderboardRunDto;

  @NestedProperty(LeaderboardRunDto, {
    required: false,
    description: 'World record for the leaderboard, could be this run'
  })
  readonly worldRecord?: LeaderboardRunDto;
}
