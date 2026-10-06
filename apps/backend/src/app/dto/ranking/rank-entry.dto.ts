import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';
import { RankEntry } from '@momentum/constants';
import { IdProperty, NestedProperty } from '../decorators';
import { UserDto } from '../user/user.dto';

export class RankEntryDto implements RankEntry {
  @ApiProperty({ type: Number, description: 'Position on the ladder, 1-based' })
  @IsInt()
  @IsPositive()
  readonly rank: number;

  @IdProperty({ description: 'ID of the user at this position' })
  readonly userID: number;

  @ApiProperty({
    type: Number,
    description:
      'Total rank points across every ranked main track for this gamemode and style'
  })
  @IsInt()
  @Min(0)
  readonly points: number;

  @NestedProperty(UserDto, { required: true })
  readonly user: UserDto;
}
