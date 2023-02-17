import { Report } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { ReportCategory, ReportType } from '../../enums/report.enum';
import { IsBoolean, IsDateString, IsDefined, IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { NestedDto } from '@lib/dto.lib';
import { UserDto } from '../user/user.dto';

export class ReportDto implements PrismaModelToDto<Report> {
    @IdProperty()
    id: number;

    // @ApiProperty({
    //     description: 'The ID of the object being referred to by the report, as a string',
    //     type: String
    // })
    // // TODO: Using a string here is a bit gross, there's a comment about it in the db/report.js in old api.
    // // Might be able to switch to int, look into this.
    // @IsString()
    // Old shit above that I don't fully understand, I think using a number/bigint will be fine with maybe some small
    // refactor, comment is "data: type.STRING, // everything's an int except for users..." and I have no idea why
    // it's different for users, need to read models/report.js or whatever closer
    @IdProperty({ description: 'The ID of the object being referred to by the report', bigint: true })
    data: number;

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

    @IdProperty({ description: 'The user ID of the submitter' })
    submitterID: number;

    @NestedProperty(UserDto)
    submitter: UserDto;

    @IdProperty({ description: 'The user ID of the resolver, if its been resolved' })
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
