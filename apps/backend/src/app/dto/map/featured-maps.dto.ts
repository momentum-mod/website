import { Gamemode } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsArray, IsInt, IsPositive } from 'class-validator';
import { EnumProperty } from '../decorators';

export class FeaturedMapsForGamemodeDto {
  @EnumProperty(Gamemode)
  @Expose()
  readonly gamemode: Gamemode;

  @ApiProperty({ type: [Number], description: 'IDs of the featured maps' })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  readonly mapIDs: number[];
}
