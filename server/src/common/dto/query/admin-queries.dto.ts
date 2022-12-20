import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AdminCreateUserQuery {
    @ApiProperty({
        name: 'alias',
        description: 'The alias to set the new user to'
    })
    @IsString()
    alias: string;
}
