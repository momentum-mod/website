import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { Exclude } from 'class-transformer';
import { MapStats } from '@momentum/constants';
import { SafeBigIntToNumber } from '../decorators';

export class MapStatsDto implements MapStats {
  @Exclude()
  readonly mapID: number;

  @ApiProperty()
  @IsInt()
  readonly reviews: number;

  @ApiProperty()
  @IsInt()
  readonly downloads: number;

  @ApiProperty()
  @IsInt()
  readonly subscriptions: number;

  @ApiProperty()
  @IsInt()
  readonly plays: number;

  @ApiProperty()
  @IsInt()
  readonly favorites: number;

  @ApiProperty()
  @IsInt()
  readonly completions: number;

  @ApiProperty()
  @IsInt()
  readonly uniqueCompletions: number;

  @ApiProperty({
    description: 'The total time played on the map',
    type: String
  })
  @IsInt()
  @SafeBigIntToNumber()
  readonly timePlayed: number;
}
