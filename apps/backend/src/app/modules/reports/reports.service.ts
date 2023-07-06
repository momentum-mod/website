import { Injectable } from '@nestjs/common';
import { Prisma, Report } from '@prisma/client';
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

  async createReport(submitterID: number, data: CreateReportDto) {
    const where: Prisma.ReportWhereInput = {
      submitterID: submitterID,
      resolved: false,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      }
    };
    const recentReports = await this.userRepo.getAllReports(where);

    if (recentReports[1] >= this.config.get('limits.maxDailyReports'))
      throw new ConflictException(
        'You have reached the limit of daily reports'
      );

    const input: Prisma.ReportCreateInput = {
      data: data.data,
      type: data.type,
      category: data.category,
      message: data.message,
      submitter: { connect: { id: submitterID } }
    };
    const dbResponse: Report = await this.userRepo.createReport(input);
    return DtoFactory(ReportDto, dbResponse);
  }
}
