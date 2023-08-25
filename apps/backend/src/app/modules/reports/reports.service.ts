import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common/exceptions/conflict.exception';
import { CreateReportDto, DtoFactory, ReportDto } from '@momentum/backend/dto';
import { EXTENDED_PRISMA_SERVICE } from '../database/db.constants';
import { ExtendedPrismaService } from '../database/prisma.extension';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,

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

    if (recentReports >= this.config.get('limits.dailyReports'))
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
