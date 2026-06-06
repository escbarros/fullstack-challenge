import { Injectable } from "@nestjs/common";
import { RoundRepository } from "../domain";
import { GameGateway } from "../presentation/game.gateway";

@Injectable()
export class StartActivePhaseUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly gameGateway: GameGateway,
  ) {}

  async execute(): Promise<void> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      console.log("betting round not found")
      return;
    }

    round.start();

    await this.roundRepository.save(round);

    this.gameGateway.emitRoundStarted({
      roundId: round.id,
      startedAt: round.startedAt!,
    });
  }
}
