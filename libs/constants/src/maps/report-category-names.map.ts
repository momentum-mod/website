import { ReportCategory } from '../enums/report-category.enum';
import { CompleteMap } from '../types/utils/compete-map.type';

export const ReportCategoryNames: ReadonlyMap<ReportCategory, string> = new Map(
  [
    [ReportCategory.OTHER, 'Other'],
    [ReportCategory.INAPPROPRIATE_CONTENT, 'Inappropriate Content'],
    [ReportCategory.PLAGIARISM, 'Plagiarism'],
    [ReportCategory.SPAM, 'Spam']
  ]
) satisfies CompleteMap<ReportCategory>;
