import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { CreateReportDto, ReportDto } from '../../dto';
import { LoggedInUser } from '../../decorators';
import { ReportsService } from './reports.service';

@Controller('reports')
@ApiTags('Reports')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a report' })
  @ApiBody({ type: CreateReportDto, required: true })
  @ApiOkResponse({ type: ReportDto, description: 'The newly created report' })
  createReport(
    @LoggedInUser('id') submitter: number,
    @Body() body: CreateReportDto
  ): Promise<ReportDto> {
    return this.reportsService.createReport(submitter, body);
  }
}
