import { DateString } from '../../utils';

export interface MapSubmissionDates {
  [k: string]: string;

  submitted: DateString;
  contentApproval: DateString;
  publicTesting: DateString;
  finalApproval: DateString;
  approved: DateString;
}
