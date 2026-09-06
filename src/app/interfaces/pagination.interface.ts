export interface IStatusCounts {
  all: number;
  published: number;
  draft: number;
  paused: number;
  archived: number;
}

export interface IPaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  pagination: IPaginationInfo;
  statusCounts?: IStatusCounts;
}
