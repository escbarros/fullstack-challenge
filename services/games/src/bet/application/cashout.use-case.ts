import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BetRepository } from "../domain/bet.repository";
import { BetStatus } from "../domain/bet.entity";
import { RoundRepository } from "../../round/domain/round.repository";
import { RoundStatus } from "../../round/domain/round.entity";
import { Outbox } from "../../outbox/domain/outbox.entity";
import { GameGateway } from "../../round/presentation/game.gateway";
import type { Env } from "../../utils/env";

interface CashoutParams {
  roundId: string;
  playerId: string;
}

interface CashoutResult {
  roundId: string;
  cashoutMultiplier: string;
  payoutCents: string;
  status: string;
}

@Injectable()
export class CashoutUseCase {
  private readonly logger = new Logger(CashoutUseCase.name);
  private readonly growthRate: number;

  constructor(
    private readonly betRepo: BetRepository,
    private readonly roundRepo: RoundRepository,
    private readonly gameGateway: GameGateway,
    config: ConfigService<Env, true>,
  ) {
    this.growthRate = config.get("GROWTH_RATE");
  }

  async execute(params: CashoutParams): Promise<CashoutResult> {
    const { roundId, playerId } = params;

    const bet = await this.betRepo.findActiveByRoundAndPlayer(roundId, playerId);

    if (!bet) throw new NotFoundException("BET_NOT_FOUND");
    if (bet.playerId !== playerId) throw new ForbiddenException("FORBIDDEN");
    if (bet.status !== BetStatus.CONFIRMED) {
      throw new ConflictException("BET_NOT_CONFIRMED");
    }
    const round = await this.roundRepo.findById(bet.round.id);
    if (!round || round.status !== RoundStatus.ACTIVE) {
      throw new ConflictException("ROUND_NOT_ACTIVE");
    }

    const elapsed = (Date.now() - round.startedAt!.getTime()) / 1000;
    const multiplier = Math.exp(elapsed * this.growthRate);

    bet.applyCashout(multiplier);

    this.logger.debug("Multiplier aplied")

    const outbox = Outbox.buildWalletCreditMessage({
      betId: bet.id,
      playerId,
      payoutCents: bet.payoutCents!,
      cashoutMultiplier: bet.cashoutMultiplier!,
    });

    this.logger.debug("Outboox => ", outbox)

    await this.betRepo.saveBetWithOutbox(bet, outbox);

    this.logger.debug("Outbox saved")
    this.gameGateway.emitRoundCashout({
      roundId: round.id,
      playerId,
      username: bet.username,
      cashoutMultiplier: multiplier,
      payoutCents: Number(bet.payoutCents),
    });
    this.logger.debug({
      betId: bet.id,
      cashoutMultiplier: bet.cashoutMultiplier!,
      payoutCents: bet.payoutCents!,
      status: bet.status,
    })

    return {
      betId: bet.id,
      cashoutMultiplier: bet.cashoutMultiplier!,
      payoutCents: bet.payoutCents!,
      status: bet.status,
    };
  }
}
