import { IsJWT, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JWTResponseWebDto {
    @ApiProperty({ type: String, description: 'A JWT access token' })
    @IsJWT()
    accessToken: string;

    @ApiProperty({ type: String, description: 'A JWT refresh token' })
    @IsJWT()
    refreshToken: string;

    @ApiProperty({ type: String, description: 'String representing the time until the token will expire' })
    @IsString()
    expiresIn: string;
}

export class JWTResponseGameDto {
    @ApiProperty({ type: String, description: 'A JWT access token' })
    @IsJWT()
    token: string;

    @ApiProperty({ type: Number, description: 'The length in chars of the token' })
    @IsPositive()
    length: number;
}
