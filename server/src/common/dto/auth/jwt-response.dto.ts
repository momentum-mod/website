import { IsJWT, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JWTResponseWebDto {
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

export class JWTResponseGameDto {
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
