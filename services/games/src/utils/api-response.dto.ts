export class ApiResponseDto<T> {
  data: T;
  meta: Record<string, unknown> | null;
  error: string | null;

  static ok<T>(data: T): ApiResponseDto<T> {
    return { data, meta: null, error: null };
  }
}
