import { AdminActivityType } from '../../enums/admin-activity-type.enum';
import { PagedQuery } from './pagination.model';

export type AdminGetReportsExpand = ('submitter' | 'resolver')[];

export type AdminGetReportsQuery = PagedQuery & {
  expand?: AdminGetReportsExpand;
  resolved?: boolean;
};

export type AdminActivitiesGetQuery = PagedQuery & {
  filter?: AdminActivityType;
};
