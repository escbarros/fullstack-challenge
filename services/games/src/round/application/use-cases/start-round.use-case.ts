import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  generateServerSeed,
  generateClientSeed,
  generateSeedHash,
  generateCrashPoint,
  Round,
  RoundRepository,
} from "../../domain";
import { GameGateway } from "../../presentation/game.gateway";
import { Env } from "../../../utils/env";

@Injectable()
export class StartRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly gameGateway: GameGateway,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async execute(): Promise<Round> {
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const seedHash = generateSeedHash(serverSeed);
    const crashPoint = generateCrashPoint(serverSeed, clientSeed);

    const bettingDurationMs = this.config.get("BETTING_DURATION_MS", {
      infer: true,
    });
    const bettingEndsAt = new Date(Date.now() + bettingDurationMs);

    const round = Round.create({
      serverSeed,
      clientSeed,
      seedHash,
      crashPoint: String(crashPoint),
      bettingEndsAt,
    });
    await this.roundRepository.save(round);

    this.gameGateway.emitRoundBetting({
      roundId: round.id,
      seedHash: round.seedHash,
      bettingEndsAt: round.bettingEndsAt,
    });

    return round;
  }
}
