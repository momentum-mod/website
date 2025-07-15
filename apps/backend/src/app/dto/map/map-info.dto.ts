import {
  CreateMapInfo,
  DateString,
  MapInfo,
  MAX_MAP_DESCRIPTION_LENGTH,
  MIN_MAP_DESCRIPTION_LENGTH,
  UpdateMapInfo,
  SteamGame
} from '@momentum/constants';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
  IsEnum,
  IsDate
} from 'class-validator';
import { IsPastDate } from '../../validators/is-past-date';

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
  @IsPastDate()
  readonly creationDate: DateString;

  @ApiProperty()
  @IsDate()
  @IsOptional()
  readonly approvedDate: DateString | null;

  @ApiProperty({ description: 'Array of apps, which the map uses assets from' })
  @IsEnum(SteamGame, { each: true })
  @IsOptional()
  readonly requiredGames: SteamGame[];
}

export class CreateMapInfoDto
  extends PickType(MapInfoDto, [
    'description',
    'youtubeID',
    'creationDate',
    'requiredGames'
  ] as const)
  implements CreateMapInfo {}

export class UpdateMapInfoDto
  extends PartialType(CreateMapInfoDto)
  implements UpdateMapInfo {}
