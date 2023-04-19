import { MapInfo } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
  Matches
} from 'class-validator';
import { CreatedAtProperty, IdProperty, UpdatedAtProperty } from '@lib/dto.lib';

export class MapInfoDto implements MapInfo {
  @IdProperty()
  readonly id: number;

  @ApiProperty({
    type: String,
    description: 'Author-submitted description of the map'
  })
  @IsString()
  readonly description: string;

  @ApiProperty({
    type: String,
    description:
      'ID of Youtube video for the map, for use with e.g. https://www.youtube.com/?v=[ID]'
  })
  @IsOptional()
  @Matches(/^[\w-_]{11}$/)
  readonly youtubeID: string;

  @ApiProperty()
  @IsPositive()
  readonly numTracks: number;

  @ApiProperty()
  @IsDateString()
  readonly creationDate: Date;

  @Exclude()
  readonly mapID: number;

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateMapInfoDto extends PickType(MapInfoDto, [
  'description',
  'youtubeID',
  'numTracks',
  'creationDate'
] as const) {}

export class UpdateMapInfoDto extends PartialType(
  PickType(MapInfoDto, ['description', 'youtubeID', 'creationDate'] as const)
) {}
