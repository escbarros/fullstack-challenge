import { Injectable, NotFoundException } from "@nestjs/common";
import { createHmac } from "crypto";
import { RoundRepository } from "../../domain";
import { RoundStatus } from "../../domain/round.entity";
import { generateSeedHash, generateCrashPoint } from "../../domain/provably-fair";

export interface VerifyRoundResult {
  roundId: string;
  crashPoint: string;
  seedHash: string;
  serverSeed: string;
  clientSeed: string;
  verification: {
    step1_sha256_of_serverSeed: string;
    step1_matchesSeedHash: boolean;
    step2_hmac: string;
    step2_hex8: string;
    step2_int: number;
    step3_crashPoint: string;
    step3_matchesClaimed: boolean;
  };
}

@Injectable()
export class VerifyRoundUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(roundId: string): Promise<VerifyRoundResult> {
    const round = await this.roundRepository.findById(roundId);

    if (!round || round.status !== RoundStatus.CRASHED) {

      throw new NotFoundException("Round not found or seed not yet revealed");
    }

    const { serverSeed, clientSeed, seedHash, crashPoint } = round;

    const step1_sha256 = generateSeedHash(serverSeed);
    const step1_matches = step1_sha256 === seedHash;

    const hmacFull = createHmac("sha256", serverSeed).update(clientSeed).digest("hex");
    const hex8 = hmacFull.slice(0, 8);
    const int32 = parseInt(hex8, 16);

    const computedCrashPoint = generateCrashPoint(serverSeed, clientSeed);
    const step3_crashPoint = computedCrashPoint.toFixed(2);
    const step3_matches = step3_crashPoint === crashPoint;

    return {
      roundId: round.id,
      crashPoint,
      seedHash,
      serverSeed,
      clientSeed,
      verification: {
        step1_sha256_of_serverSeed: step1_sha256,
        step1_matchesSeedHash: step1_matches,
        step2_hmac: hmacFull,
        step2_hex8: hex8,
        step2_int: int32,
        step3_crashPoint,
        step3_matchesClaimed: step3_matches,
      },
    };
  }
}
