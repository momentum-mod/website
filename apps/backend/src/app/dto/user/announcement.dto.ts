import {
  AdminAnnouncement,
  MAX_ADMIN_ANNOUNCEMENT_LENGTH
} from '@momentum/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminAnnouncementDto implements AdminAnnouncement {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(MAX_ADMIN_ANNOUNCEMENT_LENGTH)
  readonly message: string;
}
