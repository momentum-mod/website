import { Report } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { ReportCategory, ReportType } from '../../enums/report.enum';
import { IsBoolean, IsDateString, IsDefined, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';

export class ReportDto implements Report {
    @ApiProperty({
        description: 'The ID of the report',
        type: Number
    })
    @IsDefined()
    @IsInt()
    id: number;

    @ApiProperty({
        description: 'The ID of the object being referred to by the report, as a string',
        type: String
    })
    // Using a string here is a bit gross, there's a comment about it in the db/report.js in old api.
    // Might be able to switch to int, look into this.
    @IsDefined()
    @IsString()
    data: string;

    @ApiProperty({
        description: 'The type of the report',
        enum: ReportType
    })
    @IsEnum(ReportType)
    type: ReportType;

    @ApiProperty({
        description: 'The category of the report',
        enum: ReportCategory
    })
    @IsEnum(ReportCategory)
    category: ReportCategory;

    @ApiProperty({
        description: 'The main text of the report',
        type: String
    })
    message: string;

    @ApiProperty({
        description: 'Whether the report has been resolved or not',
        type: Boolean
    })
    @IsDefined()
    @IsBoolean()
    resolved: boolean;

    @ApiPropertyOptional({
        description: 'The reason the report was resolved, if it was',
        type: String
    })
    @IsOptional()
    resolutionMessage: string;

    @ApiProperty({
        description: 'The user ID of the submitter',
        type: Number
    })
    @IsDefined()
    @IsInt()
    submitterID: number;

    @NestedDto(UserDto)
    submitter: UserDto;

    @ApiPropertyOptional({
        description: 'The user ID of the resolver, if its been resolved',
        type: Number
    })
    @IsOptional()
    resolverID: number;

    @ApiProperty()
    @IsDateString()
    createdAt: Date;

    @ApiProperty()
    @IsDateString()
    updatedAt: Date;
}

export class CreateReportDto extends PickType(ReportDto, ['data', 'type', 'category', 'message'] as const) {}

export class UpdateReportDto extends PickType(ReportDto, ['resolved', 'resolutionMessage'] as const) {}
