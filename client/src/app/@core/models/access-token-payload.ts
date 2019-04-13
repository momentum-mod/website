export interface AccessTokenPayload {
  id: string;
  roles: number;
  bans: number;
  gameAuth: boolean;
  iat: number;
  exp: number;
  iss: string;
}
