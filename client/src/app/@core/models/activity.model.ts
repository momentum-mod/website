import {Activity_Type} from './activity-type.model';

export interface Activity {
  id: number;
  type: Activity_Type;
  userID: string;
  data: string;
}
