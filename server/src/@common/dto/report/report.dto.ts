import { Report } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { EReportCategory, EReportType } from '../../enums/report.enum';
import { IsBoolean, IsDate, IsEnum, IsOptional } from 'class-validator';

export class ReportDto implements Report {
    @ApiProperty({
        description: 'The ID of the report',
        type: Number
    })
    id: number;

    @ApiProperty({
        description: 'The ID of the object being referred to by the report, as a string',
        type: String
    })
    // Using a string here is a bit gross, there's a comment about it in the db/report.js in old api.
    // Might be able to switch to int, look into this.
    data: string;

    @ApiProperty({
        description: 'The type of the report',
        enum: EReportType
    })
    @IsEnum(EReportType)
    type: EReportType;

    @ApiProperty({
        description: 'The category of the report',
        enum: EReportCategory
    })
    @IsEnum(EReportCategory)
    category: EReportCategory;

    @ApiProperty({
        description: 'The main text of the report',
        type: String
    })
    message: string;

    @ApiProperty({
        description: 'Whether the report has been resolved or not',
        type: Boolean
    })
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
    submitterID: number;

    @ApiPropertyOptional({
        description: 'The user ID of the resolver, if its been resolved',
        type: Number
    })
    @IsOptional()
    resolverID: number;

    @ApiProperty()
    @IsDate()
    createdAt: Date;

    @ApiProperty()
    @IsDate()
    updatedAt: Date;
}

export class CreateReportDto extends PickType(ReportDto, ['data', 'type', 'category', 'message'] as const) {}

export class UpdateReportDto extends PickType(ReportDto, ['resolved', 'resolutionMessage'] as const) {}
