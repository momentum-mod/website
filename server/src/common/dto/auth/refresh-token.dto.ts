import { IsJWT } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
    @ApiProperty({ type: String, description: 'A JWT refresh token' })
    @IsJWT()
    readonly refreshToken: string;
}
