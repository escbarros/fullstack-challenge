import { ApiProperty } from "@nestjs/swagger";

export class BetInRoundDto {
  @ApiProperty({ example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" })
  playerId: string;

  @ApiProperty({ example: "alice" })
  username: string;

  @ApiProperty({ example: 1050, description: "Bet amount in integer cents" })
  amountCents: number;

  @ApiProperty({ example: "confirmed", enum: ["pending", "confirmed", "cashedout", "lost", "cancelled"] })
  status: string;
}
