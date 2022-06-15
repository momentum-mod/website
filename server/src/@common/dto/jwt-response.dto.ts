// TODO: validate these
export interface JWTResponseDto {
    access_token: string;
    token_type: 'JWT';
    expires_in: string;
    refresh_token: string;
}
