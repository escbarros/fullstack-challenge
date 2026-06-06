import { ApiProperty } from "@nestjs/swagger";

class VerificationStepsDto {
  @ApiProperty({ example: "a3f9bc7d2e1f..." })
  step1_sha256_of_serverSeed: string;

  @ApiProperty({ example: true })
  step1_matchesSeedHash: boolean;

  @ApiProperty({ example: "a3bf29c1f8d4..." })
  step2_hmac: string;

  @ApiProperty({ example: "a3bf29c1" })
  step2_hex8: string;

  @ApiProperty({ example: 2747600321 })
  step2_int: number;

  @ApiProperty({ example: "3.14" })
  step3_crashPoint: string;

  @ApiProperty({ example: true })
  step3_matchesClaimed: boolean;
}

export class RoundVerifyResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  roundId: string;

  @ApiProperty({ example: "3.14" })
  crashPoint: string;

  @ApiProperty({ example: "a3f9bc7d2e1f..." })
  seedHash: string;

  @ApiProperty({ example: "7f3a9d..." })
  serverSeed: string;

  @ApiProperty({ example: "2b8e1c..." })
  clientSeed: string;

  @ApiProperty({ type: () => VerificationStepsDto })
  verification: VerificationStepsDto;
}
