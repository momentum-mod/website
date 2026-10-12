import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';
import { Gamemode, Style, UserRank } from '@momentum/constants';
import { EnumProperty } from '../decorators';

export class UserRankDto implements UserRank {
  @EnumProperty(Gamemode, { description: 'Gamemode of the ladder' })
  readonly gamemode: Gamemode;

  @EnumProperty(Style, { description: 'Style of the ladder' })
  readonly style: Style;

  @ApiProperty({ type: Number, description: 'Position on the ladder, 1-based' })
  @IsInt()
  @IsPositive()
  readonly rank: number;

  @ApiProperty({ type: Number, description: 'Total rank points on the ladder' })
  @IsInt()
  @Min(0)
  readonly points: number;

  @ApiProperty({
    type: Number,
    description: 'Number of players with points on the ladder'
  })
  @IsInt()
  @Min(0)
  readonly totalPlayers: number;
}
