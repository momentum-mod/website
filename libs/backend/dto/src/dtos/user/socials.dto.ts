import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Socials } from '@momentum/constants';

export class SocialsDto implements Socials {
  [k: string]: string;
  @ApiProperty({ description: 'Discord Username', type: String })
  @IsString()
  @IsOptional()
  readonly Discord?: string;

  @ApiProperty({ description: 'Github Username', type: String })
  @IsString()
  @IsOptional()
  readonly Github?: string;

  @ApiProperty({ description: 'Instagram Username', type: String })
  @IsString()
  @IsOptional()
  readonly Instagram?: string;

  @ApiProperty({ description: 'Ko-fi Username', type: String })
  @IsString()
  @IsOptional()
  readonly 'Ko-fi'?: string;

  @ApiProperty({ description: 'LinkedIn Username', type: String })
  @IsString()
  @IsOptional()
  readonly LinkedIn?: string;

  @ApiProperty({ description: 'Mastodon Username', type: String })
  @IsString()
  @IsOptional()
  readonly Mastodon?: string;

  @ApiProperty({ description: 'Patreon Username', type: String })
  @IsString()
  @IsOptional()
  readonly Patreon?: string;

  @ApiProperty({ description: 'Paypal Username', type: String })
  @IsString()
  @IsOptional()
  readonly Paypal?: string;

  @ApiProperty({ description: 'Spotify Username', type: String })
  @IsString()
  @IsOptional()
  readonly Spotify?: string;

  @ApiProperty({ description: 'Twitch Username', type: String })
  @IsString()
  @IsOptional()
  readonly Twitch?: string;

  @ApiProperty({ description: 'Twitter Username', type: String })
  @IsString()
  @IsOptional()
  readonly Twitter?: string;

  @ApiProperty({ description: 'YouTube Username', type: String })
  @IsString()
  @IsOptional()
  readonly YouTube?: string;
}

export class UpdateSocialsDto extends SocialsDto {}
