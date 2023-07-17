import { Report } from '@momentum/constants';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { UserDto } from '../user/user.dto';
import {
  CreatedAtProperty,
  EnumProperty,
  IdProperty,
  NestedProperty,
  UpdatedAtProperty
} from '../../decorators';
import { ReportCategory, ReportType } from '@momentum/constants';

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
  readonly createdAt: Date;

  @UpdatedAtProperty()
  readonly updatedAt: Date;
}

export class CreateReportDto extends PickType(ReportDto, [
  'data',
  'type',
  'category',
  'message'
] as const) {}

export class UpdateReportDto extends PickType(ReportDto, [
  'resolved',
  'resolutionMessage'
] as const) {}
