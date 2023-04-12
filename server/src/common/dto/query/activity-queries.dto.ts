import { PaginationQuery } from './pagination.dto';
import { ActivityType } from '../../enums/activity.enum';
import { EnumQueryProperty, IntQueryProperty } from '@lib/dto.lib';

export class ActivitiesGetQuery extends PaginationQuery {
    @IntQueryProperty({ description: 'Filter by user ID' })
    readonly userID: number;

    @EnumQueryProperty(ActivityType, { description: 'Types of activities to include' })
    readonly type: ActivityType;

    @IntQueryProperty({ description: 'The ID into the table of the corresponding activity' })
    readonly data: number;
}
