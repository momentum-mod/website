import { PaginationQuery } from './pagination.dto';
import { ActivityTypes } from '../../enums/activity.enum';
import { EnumQueryProperty, IntQueryProperty } from '@lib/dto.lib';

export class ActivitiesGetQuery extends PaginationQuery {
    @IntQueryProperty({ description: 'Filter by user ID' })
    userID: number;

    @EnumQueryProperty(ActivityTypes, { description: 'Types of activities to include' })
    type: ActivityTypes;

    @IntQueryProperty({ description: 'The ID into the table of the corresponding activity' })
    data: number;
}
