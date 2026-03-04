export interface IPaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  pagination: IPaginationInfo;
}
