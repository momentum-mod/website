import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { BooleanQueryParam } from '@lib/dto.lib';
import { PaginationQuery } from './pagination.dto';

export class AdminCreateUserQuery {
    @ApiProperty({
        name: 'alias',
        description: 'The alias to set the new user to'
    })
    @IsString()
    alias: string;
}

export class AdminGetReportsQuery extends PaginationQuery {
    @ApiPropertyOptional({
        name: 'resolved',
        type: Boolean,
        description: 'Specifies if you want resolved or not'
    })
    @IsOptional()
    @BooleanFixer()
    @IsBoolean()
    resolved: boolean;
}
