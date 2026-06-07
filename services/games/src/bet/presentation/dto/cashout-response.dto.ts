import { ApiProperty } from "@nestjs/swagger";

export class CashoutResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  betId: string;

  @ApiProperty({ example: "2.34", description: "Multiplier at the time of cashout" })
  cashoutMultiplier: string;

  @ApiProperty({ example: "2340", description: "Payout amount in cents" })
  payoutCents: string;

  @ApiProperty({ example: "cashedout" })
  status: string;
}
