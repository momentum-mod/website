export interface AccessTokenPayload {
  id: string;
  permissions: number;
  gameAuth: boolean;
  iat: number;
  exp: number;
  iss: string;
}
