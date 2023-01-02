import { Injectable } from '@nestjs/common';
import { UsersRepoService } from '../repo/users-repo.service';
import { Prisma, Report } from '@prisma/client';
import { DtoFactory } from '@lib/dto.lib';
import { CreateReportDto, ReportDto } from '@common/dto/report/report.dto';

@Injectable()
export class ReportsService {
    constructor(private readonly userRepo: UsersRepoService) {}

    async createReport(submitterID: number, data: CreateReportDto) {
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
