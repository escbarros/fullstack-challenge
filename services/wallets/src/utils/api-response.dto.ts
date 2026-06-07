export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export class ApiResponseDto<TData, TMeta = null, TError = null> {
  data!: TData;
  meta!: TMeta;
  error!: TError;

  static ok<TData>(data: TData): ApiResponseDto<TData, null, null> {
    return { data, meta: null, error: null };
  }

  static error<TError>(error: TError) {
    return { data: null, meta: null, error };
  }
}
