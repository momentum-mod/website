import { IsJWT, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JWTResponseGame, JWTResponseWeb } from '@momentum/types';

export class JWTResponseWebDto implements JWTResponseWeb {
  @ApiProperty({ type: String, description: 'A JWT access token' })
  @IsJWT()
  readonly accessToken: string;

  @ApiProperty({ type: String, description: 'A JWT refresh token' })
  @IsJWT()
  readonly refreshToken: string;

  @ApiProperty({
    type: String,
    description: 'String representing the time until the token will expire'
  })
  @IsString()
  readonly expiresIn: string;
}

export class JWTResponseGameDto implements JWTResponseGame {
  @ApiProperty({ type: String, description: 'A JWT access token' })
  @IsJWT()
  readonly token: string;

  @ApiProperty({
    type: Number,
    description: 'The length in chars of the token'
  })
  @IsPositive()
  readonly length: number;
}
