import { BooleanQueryProperty, StringQueryProperty } from '@lib/dto.lib';
import { PaginationQuery } from './pagination.dto';

export class AdminCreateUserQuery {
    @StringQueryProperty({ required: true, description: 'The alias to set the new user to' })
    alias: string;
}

export class AdminGetReportsQuery extends PaginationQuery {
    @BooleanQueryProperty({ required: false, description: 'Specifies if you want resolved or not' })
    resolved: boolean;
}
