import { IsJWT } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RefreshToken } from '@momentum/constants';

export class RefreshTokenDto implements RefreshToken {
  @ApiProperty({ type: String, description: 'A JWT refresh token' })
  @IsJWT()
  readonly refreshToken: string;
}
