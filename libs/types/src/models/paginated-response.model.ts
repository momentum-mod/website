export interface PaginatedResponse<T> {
  totalCount: number;
  returnCount: number;
  response: T[];
}
