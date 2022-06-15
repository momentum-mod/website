﻿import { ApiProperty } from '@nestjs/swagger';

export class AdminCreateUserQuery {
    @ApiProperty({
        description: 'The alias to set the new user to.',
        type: String
    })
    alias: string;
}
