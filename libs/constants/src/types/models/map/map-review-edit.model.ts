import { DateString } from '../../utils';

export interface MapReviewEdit {
  mainText?: string;
  resolved?: boolean | null;
  editorID: number;
  date: DateString;
}
