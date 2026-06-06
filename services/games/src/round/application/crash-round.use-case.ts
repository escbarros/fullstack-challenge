import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../domain";
import { BetRepository } from "../../bet/domain/bet.repository";
import { BetStatus } from "../../bet/domain/bet.entity";
import { GameGateway } from "../presentation/game.gateway";
import { StartRoundUseCase } from "./start-round.use-case";

@Injectable()
export class CrashRoundUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly betRepository: BetRepository,
    private readonly gameGateway: GameGateway,
    private readonly startRoundUseCase: StartRoundUseCase,
  ) {}

  async execute(roundId: string): Promise<void> {
    const round = await this.roundRepository.findWithLock(roundId);

    if (!round) {
      return;
    }

    round.crash();

    const activeBets = await this.betRepository.findActiveByRoundId(roundId);
    for (const bet of activeBets) {
      if (bet.status === BetStatus.CONFIRMED) {
        bet.markAsLost();
      } else if (bet.status === BetStatus.PENDING) {
        bet.cancel();
      }
    }

    await this.roundRepository.save(round);

    this.gameGateway.emitRoundCrashed({
      roundId: round.id,
      crashPoint: parseFloat(round.crashPoint),
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      seedHash: round.seedHash,
    });

    await this.startRoundUseCase.execute();
  }
}
