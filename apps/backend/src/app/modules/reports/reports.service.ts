import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common/exceptions/conflict.exception';
import { ReportType } from '@momentum/constants';
import { CreateReportDto, DtoFactory, ReportDto } from '../../dto';
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

    if (recentReports >= this.config.getOrThrow('limits.dailyReports'))
      throw new ConflictException(
        'You have reached the limit of daily reports'
      );

    // If a SteamID is specified, look up that user and use
    // them as the target of this report.
    let data = input.data;
    if (input.targetSteamID != null) {
      if (input.type !== ReportType.PLAYER_REPORT)
        throw new BadRequestException(
          'targetSteamID is only valid for player reports'
        );

      const reported = await this.db.user.findFirst({
        where: { steamID: BigInt(input.targetSteamID) },
        select: { id: true }
      });

      if (!reported) throw new NotFoundException('Reported player not found');

      data = reported.id;
    }

    if (data == null)
      throw new BadRequestException(
        'A report must specify either data or targetSteamID'
      );

    if (input.type === ReportType.PLAYER_REPORT) {
      const recentPlayerReports = await this.db.report.count({
        where: {
          submitterID: submitterID,
          type: ReportType.PLAYER_REPORT,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        }
      });

      if (
        recentPlayerReports >=
        this.config.getOrThrow('limits.hourlyPlayerReports')
      )
        throw new ConflictException(
          'You have reached the limit of player reports per hour'
        );

      const existingReport = await this.db.report.findFirst({
        where: {
          submitterID: submitterID,
          type: ReportType.PLAYER_REPORT,
          data,
          resolved: false
        }
      });

      if (existingReport)
        throw new ConflictException(
          'You already have an unresolved report against this player'
        );
    }

    return DtoFactory(
      ReportDto,
      await this.db.report.create({
        data: {
          data,
          type: input.type,
          category: input.category,
          message: input.message,
          submitter: { connect: { id: submitterID } }
        }
      })
    );
  }
}
