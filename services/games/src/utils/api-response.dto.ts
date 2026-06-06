import { ApiProperty } from "@nestjs/swagger";

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 348 })
  total: number;
}

export class PaginationMeta {
  @ApiProperty({ type: () => PaginationDto })
  pagination: PaginationDto;
}

export class ApiResponseDto<TData, TMeta = null, TError = null> {
  @ApiProperty({ nullable: true })
  data!: TData;

  @ApiProperty({ nullable: true })
  meta!: TMeta;

  @ApiProperty({ nullable: true })
  error!: TError;

  static ok<TData>(data: TData): ApiResponseDto<TData, null, null> {
    return {
      data,
      meta: null,
      error: null,
    };
  }

  static okWithMeta<TData, TMeta>(data: TData, meta: TMeta) {
    return {data, meta, error: null}
  }

  static error<TError>(error: TError) {
    return {data: null, meta: null, error}
  }
}
