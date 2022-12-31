import { Controller, Post, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReportDto, ReportDto } from '@common/dto/report/report.dto';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';

@Controller('api/reports')
@ApiTags('Reports')
@ApiBearerAuth()
export class ReportsController {
    constructor(private readonly _reportsService: ReportsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a report' })
    @ApiOkResponse({ type: ReportDto, description: 'The newly created report' })
    createReport(@LoggedInUser('id') _submitter: number, @Query() _query: CreateReportDto): Promise<ReportDto> {
        return void 0;
    }
}
