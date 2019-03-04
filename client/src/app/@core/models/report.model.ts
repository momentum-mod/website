import {User} from './user.model';
import {ReportType} from './report-type.model';
import {ReportCategory} from './report-category.model';

export interface Report {
  id: number;
  data: string;
  type: ReportType;
  category: ReportCategory;
  message: string;
  resolved: boolean;
  resolutionMessage: string;
  submitterID?: number;
  resolverID?: number;
  createdAt?: Date;
  updatedAt?: Date;
  submitter?: User;
  resolver?: User;
}
