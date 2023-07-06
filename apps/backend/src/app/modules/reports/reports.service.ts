import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common/exceptions/conflict.exception';
import { CreateReportDto, DtoFactory, ReportDto } from '@momentum/backend/dto';
import { DbService } from '../database/db.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly db: DbService,
    private readonly config: ConfigService
  ) {}

  async createReport(submitterID: number, input: CreateReportDto) {
    const recentReports = await this.db.report.count({
      where: {
        submitterID: submitterID,
        resolved: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }
    });

    if (recentReports >= this.config.get('limits.maxDailyReports'))
      throw new ConflictException(
        'You have reached the limit of daily reports'
      );

    return DtoFactory(
      ReportDto,
      await this.db.report.create({
        data: {
          data: input.data,
          type: input.type,
          category: input.category,
          message: input.message,
          submitter: { connect: { id: submitterID } }
        }
      })
    );
  }
}
