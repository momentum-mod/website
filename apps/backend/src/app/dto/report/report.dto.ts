import {
  CreateReport,
  DateString,
  MAX_REPORT_MESSAGE_LENGTH,
  Report,
  UpdateReport
} from '@momentum/constants';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportCategory, ReportType } from '@momentum/constants';
import { UserDto } from '../user/user.dto';
import { CreateChatBanDto } from '../chat-ban/chat-ban-input.dto';
import { IsSteamCommunityID } from '../../validators';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../decorators';

export class ReportDto implements Report {
  @IdProperty()
  readonly id: number;

  @IdProperty({
    description: 'The ID of the object being referred to by the report',
    bigint: true
  })
  readonly data: number;

  @EnumProperty(ReportType, { description: 'The type of the report' })
  readonly type: ReportType;

  @EnumProperty(ReportCategory, { description: 'The category of the report' })
  readonly category: ReportCategory;

  @ApiProperty({
    description: 'The main text of the report',
    type: String
  })
  @IsString()
  @MaxLength(MAX_REPORT_MESSAGE_LENGTH)
  readonly message: string;

  @ApiProperty({
    description: 'Whether the report has been resolved or not',
    type: Boolean
  })
  @IsBoolean()
  readonly resolved: boolean;

  @ApiPropertyOptional({
    description: 'The reason the report was resolved, if it was',
    type: String
  })
  @IsString()
  @IsOptional()
  @MaxLength(MAX_REPORT_MESSAGE_LENGTH)
  readonly resolutionMessage: string;

  @IdProperty({ description: 'The user ID of the submitter' })
  readonly submitterID: number;

  @NestedProperty(UserDto)
  readonly submitter: UserDto;

  @IdProperty({
    required: false,
    description: 'The user ID of the resolver, if its been resolved'
  })
  readonly resolverID: number;

  @NestedProperty(UserDto)
  readonly resolver: UserDto;

  @CreatedAtProperty()
  readonly createdAt: DateString;

  @UpdatedAtProperty()
  readonly updatedAt: DateString;
}

export class CreateReportDto
  extends PickType(ReportDto, ['type', 'category', 'message'] as const)
  implements CreateReport
{
  @IdProperty({
    required: false,
    bigint: true,
    description:
      'The ID of the object being reported. Provide this OR targetSteamID.'
  })
  readonly data?: number;

  @ApiPropertyOptional({
    type: String,
    description:
      'SteamID (uint64 form) of the reported player. In-game alternative to ' +
      '`data`: the backend resolves it to a user ID. Only valid for player reports.'
  })
  @IsOptional()
  @IsSteamCommunityID()
  readonly targetSteamID?: string;
}

export class UpdateReportDto
  extends PickType(ReportDto, ['resolved', 'resolutionMessage'] as const)
  implements UpdateReport
{
  @NestedProperty(CreateChatBanDto, {
    isArray: true,
    required: false,
    description:
      'Chat/voice bans to issue against the reported user when resolving a ' +
      'player report. Only honoured when the report is being resolved.'
  })
  readonly bans?: CreateChatBanDto[];
}
