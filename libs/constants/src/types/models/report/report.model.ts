import { ReportCategory } from '../../../enums/report-category.enum';
import { ReportType } from '../../../enums/report-type.enum';
import { User } from '../user/user.model';
import { Report as PrismaReport } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export interface Report extends NumberifyBigInt<PrismaReport> {
  type: ReportType;
  category: ReportCategory;
  submitter?: User;
  resolver: User;
}

export type CreateReport = Pick<
  Report,
  'data' | 'type' | 'category' | 'message'
>;

export type UpdateReport = Pick<Report, 'resolved' | 'resolutionMessage'>;
