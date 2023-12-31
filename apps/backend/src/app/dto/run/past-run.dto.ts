import { Gamemode, PastRun, Style, TrackType } from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsPositive } from 'class-validator';
import { Exclude, Expose, plainToInstance, Type } from 'class-transformer';
import { MapDto } from '../map/map.dto';
import { UserDto } from '../user/user.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty
} from '../decorators';

export class PastRunDto implements PastRun {
  @IdProperty({ bigint: true })
  readonly id: number;

  @EnumProperty(Gamemode, { description: 'The gamemode the run took place in' })
  readonly gamemode: number;

  @EnumProperty(TrackType, {
    description: 'The trackNum the run took place on'
  })
  readonly trackType: number;

  @ApiProperty({
    type: Number,
    description: 'The trackNum the run took place on'
  })
  @IsInt()
  readonly trackNum: number;

  @EnumProperty(Style, { description: 'The trackNum the run took place on' })
  readonly style: number;

  @ApiProperty({
    type: Number,
    description: 'The overall time of the run (ticks * tickRate)'
  })
  @IsNumber()
  readonly time: number;

  @ApiProperty({
    type: Number,
    isArray: true,
    description: 'Array of all the style flags that run qualified for'
  })
  @Type(() => Number)
  @IsInt({ each: true })
  readonly flags: number[];

  @ApiProperty({
    type: Boolean,
    description: 'Whether the run is a personal best'
  })
  @IsBoolean()
  readonly isPB: boolean;

  @ApiProperty()
  @IsPositive()
  readonly userID: number;

  @NestedProperty(UserDto, { required: false, lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { required: false })
  @Expose()
  get map(): MapDto {
    return plainToInstance(MapDto, this.mmap);
  }

  @Exclude()
  readonly mmap: MapDto;

  @CreatedAtProperty()
  readonly createdAt: Date;
}
