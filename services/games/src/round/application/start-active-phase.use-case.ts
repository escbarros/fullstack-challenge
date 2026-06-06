import { Injectable, Logger } from "@nestjs/common";
import { Round, RoundRepository } from "../domain";
import { GameGateway } from "../presentation/game.gateway";

@Injectable()
export class StartActivePhaseUseCase {
  private readonly logger = new Logger(StartActivePhaseUseCase.name);

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly gameGateway: GameGateway,
  ) {}

  async execute(): Promise<Round | null> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      this.logger.warn("no current round in BETTING status");
      return null;
    }

    round.start();

    await this.roundRepository.save(round);

    this.gameGateway.emitRoundStarted({
      roundId: round.id,
      startedAt: round.startedAt!,
    });

    return round;
  }
}
