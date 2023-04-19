import { UserDto } from '../user/user.dto';
import { RankDto } from './rank.dto';
import { Run } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsHash,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl
} from 'class-validator';
import { MapDto } from '../map/map.dto';
import {
  CreatedAtProperty,
  IdProperty,
  NestedProperty,
  PrismaModelToDto,
  UpdatedAtProperty
} from '@lib/dto.lib';
import { BaseStatsDto } from '../stats/base-stats.dto';
import { RunZoneStatsDto } from './run-zone-stats.dto';
import { Config } from '@config/config';
import { Exclude, Expose } from 'class-transformer';

export class RunDto implements PrismaModelToDto<Run> {
  @IdProperty({ bigint: true })
  readonly id: number;

  @ApiProperty({
    type: Number,
    description: 'The overall time of the run (ticks * tickRate)'
  })
  @IsNumber()
  readonly time: number;

  @ApiProperty({ type: Number, description: 'The track the run took place on' })
  @IsInt()
  readonly trackNum: number;

  @ApiProperty({
    type: Number,
    description: 'The number of zones in the run'
  })
  @IsInt()
  readonly zoneNum: number;

  @ApiProperty({
    type: Number,
    description: 'The total ticks'
  })
  @IsInt()
  readonly ticks: number;

  @ApiProperty()
  @IsNumber()
  readonly tickRate: number;

  @ApiProperty()
  @IsInt()
  readonly flags: number;

  @Exclude()
  readonly file: string;

  @ApiProperty({ type: String, description: 'URL to S3 storage' })
  @Expose()
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  get downloadURL() {
    return `${Config.storage.endpointUrl}/${Config.storage.bucketName}/${this.file}`;
  }

  @ApiProperty()
  @IsHash('sha1')
  @IsOptional()
  readonly hash: string;

  @IdProperty({ required: false, bigint: true })
  readonly overallStatsID: number;

  @NestedProperty(BaseStatsDto, { required: false })
  readonly overallStats: BaseStatsDto;

  @ApiProperty()
  @IsPositive()
  readonly userID: number;

  @NestedProperty(UserDto, { required: false, lazy: true })
  readonly user: UserDto;

  @IdProperty()
  readonly mapID: number;

  @NestedProperty(MapDto, { required: false })
  readonly map: MapDto;

  @NestedProperty(RankDto, { required: false, lazy: true })
  readonly rank: RankDto;

  @NestedProperty(RunZoneStatsDto, {
    required: false,
    lazy: true,
    isArray: true
  })
  readonly zoneStats: RunZoneStatsDto[];

  @CreatedAtProperty()
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}
