import { ApiProperty } from "@nestjs/swagger";

export class PlaceBetResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  betId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  roundId: string;

  @ApiProperty({ example: "player-uuid" })
  playerId: string;

  @ApiProperty({ example: "1000", description: "Bet amount in cents" })
  amountCents: string;

  @ApiProperty({ example: "pending" })
  status: string;
}
