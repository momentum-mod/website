export interface PagedResponse<T> {
  totalCount: number;
  returnCount: number;
  response: T[];
}
