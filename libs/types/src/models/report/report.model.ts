import { ReportCategory, ReportType } from '@momentum/constants';
import { User } from '@momentum/types';
import { Report as PrismaReport } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface Report extends NumberifyBigInt<PrismaReport> {
  type: ReportType;
  category: ReportCategory;
  submitter?: User;
  resolver: User;
}

export interface CreateReport
  extends Pick<Report, 'data' | 'type' | 'category' | 'message'> {}

export interface UpdateReport
  extends Pick<Report, 'resolved' | 'resolutionMessage'> {}
