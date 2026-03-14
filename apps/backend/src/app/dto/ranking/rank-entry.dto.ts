import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, Min } from 'class-validator';
import { IdProperty, NestedProperty } from '../decorators';
import { UserDto } from '../user/user.dto';

export class RankEntryDto {
  @ApiProperty({ type: Number, description: 'Rank position (1-based)' })
  @IsInt()
  @IsPositive()
  readonly rank: number;

  @IdProperty({ description: 'ID of the user at this rank' })
  readonly userID: number;

  @ApiProperty({
    type: Number,
    description:
      'Total rank XP earned across all ranked leaderboards for this gamemode'
  })
  @IsInt()
  @Min(0)
  readonly rankXP: number;

  @NestedProperty(UserDto)
  readonly user: UserDto;
}
