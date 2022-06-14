import { Controller, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';

@ApiBearerAuth()
@Controller('api/v1/reports')
@ApiTags('Reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}
}
