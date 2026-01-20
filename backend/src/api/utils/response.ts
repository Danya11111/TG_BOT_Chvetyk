import { PaginationResult } from '../../types/pagination';

export interface SuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
  pagination?: PaginationResult;
}

export const buildSuccessResponse = <T>(
  payload?: T,
  options?: {
    message?: string;
    pagination?: PaginationResult;
  }
): SuccessResponse<T> => ({
  success: true,
  ...(payload !== undefined && { data: payload }),
  ...(options?.message && { message: options.message }),
  ...(options?.pagination && { pagination: options.pagination }),
});
