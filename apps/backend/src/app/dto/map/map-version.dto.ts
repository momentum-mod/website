import { ApiProperty } from '@nestjs/swagger';
import {
  bspPath,
  CreateMapVersion,
  DateString,
  MapVersion,
  MAX_CHANGELOG_LENGTH,
  vmfsPath
} from '@momentum/constants';
import {
  IsBoolean,
  IsHash,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength
} from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { CreatedAtProperty, IdProperty, NestedProperty } from '../decorators';
import { Config } from '../../config';
import { MapZonesDto } from './map-zones.dto';

const CDN_URL = Config.url.cdn;

export class MapVersionDto implements MapVersion {
  @ApiProperty()
  @IsUUID()
  readonly id: string;

  @ApiProperty()
  @IsInt()
  readonly versionNum: number;

  @ApiProperty()
  @IsString()
  @MaxLength(MAX_CHANGELOG_LENGTH)
  @IsOptional()
  readonly changelog: string;

  @NestedProperty(MapZonesDto, {
    required: true,
    description: 'The contents of the map zone file as JSON'
  })
  @IsOptional() // We don't include this on /submissions GET expand=zones due to size
  readonly zones: MapZonesDto;

  @ApiProperty({ type: String, description: 'URL to BSP in cloud storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get downloadURL() {
    // We store BSPs relative to their UUID and don't expose maps to submission
    // to users that don't have permission (see MapsService.getMapAndCheckReadAccces)
    // so this is a reasonably secure way to keep maps hidden from most users.
    return `${CDN_URL}/${bspPath(this.id)}`;
  }

  @ApiProperty({ description: 'SHA1 hash of the BSP file', type: String })
  @IsHash('sha1')
  @IsOptional()
  readonly bspHash: string;

  @ApiProperty({ description: 'SHA1 hash of the zones', type: String })
  @IsHash('sha1')
  @IsOptional()
  readonly zoneHash: string;

  @ApiProperty({ type: String, description: 'URL to VMF in cloud storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get vmfDownloadURL() {
    return this.hasVmf ? `${CDN_URL}/${vmfsPath(this.id)}` : undefined;
  }

  @Exclude()
  readonly hasVmf: boolean;

  @IdProperty()
  readonly submitterID: number;

  @CreatedAtProperty()
  readonly createdAt: DateString;
}

export class CreateMapVersionDto implements CreateMapVersion {
  @NestedProperty(MapZonesDto, {
    required: false,
    description: 'The contents of the map zone file as JSON'
  })
  readonly zones: MapZonesDto;

  @ApiProperty()
  @IsString()
  readonly changelog: string;

  @ApiProperty({ description: 'Clear any existing leaderboards' })
  @IsBoolean()
  @IsOptional()
  readonly resetLeaderboards?: boolean;
}
