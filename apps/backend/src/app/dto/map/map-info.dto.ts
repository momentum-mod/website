import {
  CreateMapInfo,
  MapInfo,
  MAX_MAP_DESCRIPTION_LENGTH,
  MIN_MAP_DESCRIPTION_LENGTH,
  UpdateMapInfo
} from '@momentum/constants';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength
} from 'class-validator';

export class MapInfoDto implements MapInfo {
  @Exclude()
  readonly mapID: number;

  @ApiProperty({
    type: String,
    description: 'Author-submitted description of the map'
  })
  @IsString()
  @MinLength(MIN_MAP_DESCRIPTION_LENGTH)
  @MaxLength(MAX_MAP_DESCRIPTION_LENGTH)
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
  @IsDateString()
  readonly creationDate: Date;
}

export class CreateMapInfoDto
  extends PickType(MapInfoDto, [
    'description',
    'youtubeID',
    'creationDate'
  ] as const)
  implements CreateMapInfo {}

export class UpdateMapInfoDto
  extends PartialType(CreateMapInfoDto)
  implements UpdateMapInfo {}
