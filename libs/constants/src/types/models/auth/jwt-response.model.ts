export interface JWTResponseWeb {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface JWTResponseGame {
  token: string;
  length: number;
}
