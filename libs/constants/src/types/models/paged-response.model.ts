export interface PagedResponse<T> {
  totalCount: number;
  returnCount: number;
  data: T[];
}
