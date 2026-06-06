import { ApiProperty } from "@nestjs/swagger";
import { BetInRoundDto } from "./bet-in-round.dto";

export class RoundResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "betting", enum: ["betting", "active", "crashed"] })
  status: string;

  @ApiProperty({ example: "a3f9bc7d2e1f..." })
  seedHash: string;

  @ApiProperty({ example: "2026-06-06T12:00:10.000Z" })
  bettingEndsAt: string;

  @ApiProperty({ example: "2026-06-06T12:00:10.000Z", nullable: true })
  startedAt: string | null;

  @ApiProperty({ example: null, nullable: true })
  crashedAt: string | null;

  @ApiProperty({ type: () => [BetInRoundDto] })
  bets: BetInRoundDto[];
}
