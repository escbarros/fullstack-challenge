import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseDto<T> {
  @ApiProperty({ nullable: true })
  data: T;

  @ApiProperty({ nullable: true })
  meta: Record<string, unknown> | null;

  @ApiProperty({ type: "string", nullable: true })
  error: string | null;

  static ok<T>(data: T): ApiResponseDto<T> {
    return { data, meta: null, error: null };
  }
}
