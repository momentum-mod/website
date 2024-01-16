import { MapListVersion } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class MapListVersionDto implements MapListVersion {
  @ApiProperty({ description: 'Latest version of the main map list' })
  @IsInt()
  approved: number;

  @ApiProperty({ description: 'Latest version of the submission map list' })
  @IsInt()
  submissions: number;
}
