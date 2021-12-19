
export interface PagedResponseDto<T> {
    totalCount: number;
    returnCount: number;
    response: T;
}

export interface JWTResponseDto {
    access_token: string;
    token_type: "JWT";
    expires_in: string;
    refresh_token: string;
}
