export interface Pagination {
    currentPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
    totalCount: number;
}

export interface CommentPagination extends Pagination {
    commentCount: number
}