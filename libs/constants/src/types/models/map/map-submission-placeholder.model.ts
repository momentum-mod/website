import { MapCreditType } from '../../../';

export interface MapSubmissionPlaceholder {
  [k: string]: unknown;
  alias: string;
  type: MapCreditType;
  description: string;
}
