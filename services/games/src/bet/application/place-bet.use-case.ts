import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Bet } from "../domain/bet.entity";
import { BetRepository } from "../domain/bet.repository";
import { RoundRepository } from "../../round/domain/round.repository";
import { RoundStatus } from "../../round/domain/round.entity";
import { Outbox } from "../../outbox/domain/outbox.entity";

interface PlaceBetParams {
  playerId: string;
  username: string;
  amountCents: number;
}

interface PlaceBetResult {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
}

@Injectable()
export class PlaceBetUseCase {
  private readonly logger = new Logger(PlaceBetUseCase.name)
  constructor(
    private readonly betRepo: BetRepository,
    private readonly roundRepo: RoundRepository,
  ) {}

  async execute(params: PlaceBetParams): Promise<PlaceBetResult> {
    const { playerId, username, amountCents } = params;
    this.logger.debug({playerId, username, amountCents})
    Bet.validateBetAmount(amountCents);

    const round = await this.roundRepo.findCurrent();
    if (!round || round.status !== RoundStatus.BETTING) {
      throw new NotFoundException("NO_ACTIVE_BETTING_ROUND");
    }
    if (!round.isBettingOpen()) {
      throw new ConflictException("BETTING_CLOSED");
    }

    const existing = await this.betRepo.findByPlayerAndRound(playerId, round.id);
    if (Bet.isDuplicateBet(existing)) {
      throw new ConflictException("DUPLICATE_BET");
    }

    this.logger.debug("All ok")

    const bet = new Bet();
    bet.round = round as never;
    bet.playerId = playerId;
    bet.username = username;
    bet.amountCents = String(amountCents);

    const outbox = Outbox.buildWalletDebitMessage({
      betId: bet.id,
      playerId,
      amountCents,
    });

    await this.betRepo.saveBetWithOutbox(bet, outbox);
    this.logger.debug({
      betId: bet.id,
      roundId: round.id,
      playerId,
      amountCents: bet.amountCents,
      status: bet.status,
    })

    return {
      betId: bet.id,
      roundId: round.id,
      playerId,
      amountCents: bet.amountCents,
      status: bet.status,
    };
  }
}
