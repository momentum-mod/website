import { AdminActivityType } from '../../enums/admin-activity-type.enum';
import { PagedQuery } from './pagination.model';

export type AdminGetReportsExpand = ('submitter' | 'resolver')[];

export type AdminGetReportsQuery = PagedQuery & {
  expand?: AdminGetReportsExpand;
  resolved?: boolean;
};

export type AdminGetAdminActivitiesQuery = PagedQuery & {
  filter?: AdminActivityType[];
};

export type AdminGetChatBansExpand = ('target' | 'issuer')[];

export type AdminGetChatBansQuery = PagedQuery & {
  // Restrict to a single banned user (used by the profile page).
  targetID?: number;
  // If omitted or false, only active (unexpired) bans are returned.
  includeExpired?: boolean;
  expand?: AdminGetChatBansExpand;
};

export type AdminAnnouncement = { message: string };
