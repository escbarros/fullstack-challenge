import { ApiProperty } from "@nestjs/swagger";

export class RoundHistoryItemDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "3.14" })
  crashPoint: string;

  @ApiProperty({ example: "a3f9bc7d2e1f..." })
  seedHash: string;

  @ApiProperty({ example: "2026-06-03T11:50:00.000Z" })
  startedAt: string;

  @ApiProperty({ example: "2026-06-03T11:50:18.000Z" })
  crashedAt: string;
}
