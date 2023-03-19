import { Controller, Post, Body } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReportDto, ReportDto } from '@common/dto/report/report.dto';
import { LoggedInUser } from '@common/decorators/logged-in-user.decorator';

@Controller('reports')
@ApiTags('Reports')
@ApiBearerAuth()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a report' })
    @ApiOkResponse({ type: ReportDto, description: 'The newly created report' })
    createReport(@LoggedInUser('id') submitter: number, @Body() body: CreateReportDto): Promise<ReportDto> {
        return this.reportsService.createReport(submitter, body);
    }
}
