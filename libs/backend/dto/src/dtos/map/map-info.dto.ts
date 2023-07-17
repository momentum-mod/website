import { CreateMapInfo, MapInfo, UpdateMapInfo } from '@momentum/constants';
import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
  Matches
} from 'class-validator';
import {
  CreatedAtProperty,
  IdProperty,
  UpdatedAtProperty
} from '../../decorators';

export class MapInfoDto implements MapInfo {
  @IdProperty()
  readonly id: number;

  @Exclude()
  readonly mapID: number;

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

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateMapInfoDto
  extends PickType(MapInfoDto, [
    'description',
    'youtubeID',
    'numTracks',
    'creationDate'
  ] as const)
  implements CreateMapInfo {}

export class UpdateMapInfoDto
  extends PartialType(
    PickType(MapInfoDto, ['description', 'youtubeID', 'creationDate'] as const)
  )
  implements UpdateMapInfo {}
