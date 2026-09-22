import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString
} from 'class-validator';
import { TwitchStream } from '@momentum/constants';

export class TwitchStreamDto implements TwitchStream {
  @ApiProperty({ description: 'Stream ID', type: String })
  @IsString()
  readonly id: string;

  @ApiProperty({ description: 'Streamer user ID', type: String })
  @IsString()
  readonly user_id: string;

  @ApiProperty({ description: 'Streamer login name', type: String })
  @IsString()
  readonly user_login: string;

  @ApiProperty({ description: 'Streamer display name', type: String })
  @IsString()
  readonly user_name: string;

  @ApiProperty({ description: 'Game ID', type: String })
  @IsString()
  readonly game_id: string;

  @ApiProperty({ description: 'Game name', type: String })
  @IsString()
  readonly game_name: string;

  @ApiProperty({ description: 'Stream type', type: String })
  @IsString()
  readonly type: string;

  @ApiProperty({ description: 'Stream title', type: String })
  @IsString()
  readonly title: string;

  @ApiProperty({ description: 'Stream tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  readonly tags: string[];

  @ApiProperty({ description: 'Viewer count', type: Number })
  @IsInt()
  readonly viewer_count: number;

  @ApiProperty({ description: 'Stream start time', type: String })
  @IsString()
  readonly started_at: string;

  @ApiProperty({ description: 'Language code', type: String })
  @IsString()
  readonly language: string;

  @ApiProperty({ description: 'Thumbnail URL', type: String })
  @IsString()
  readonly thumbnail_url: string;

  @ApiProperty({
    description: 'Tag IDs (deprecated)',
    type: [String],
    required: false
  })
  @IsArray()
  @IsOptional()
  readonly tag_ids: any[];

  @ApiProperty({ description: 'Is mature content', type: Boolean })
  @IsBoolean()
  readonly is_mature: boolean;
}
