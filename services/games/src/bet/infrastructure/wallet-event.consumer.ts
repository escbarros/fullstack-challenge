import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { BetRepository } from "../domain/bet.repository";
import { BetStatus } from "../domain/bet.entity";
import { GameGateway } from "../../round/presentation/game.gateway";

interface DebitSuccessMsg {
  betId: string;
  playerId: string;
  balanceCents: string;
}

interface DebitFailedMsg {
  betId: string;
  playerId: string;
  reason: string;
}

@Controller()
export class WalletEventConsumer {
  constructor(
    private readonly orm: MikroORM,
    private readonly betRepo: BetRepository,
    private readonly gameGateway: GameGateway,
  ) {}

  @MessagePattern("wallet.debit.success")
  async onDebitSuccess(@Payload() msg: DebitSuccessMsg): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      const bet = await this.betRepo.findById(msg.betId);
      if (!bet || bet.status !== BetStatus.PENDING) return;

      bet.confirm();
      await this.betRepo.save(bet);

      this.gameGateway.emitRoundBet({
        roundId: bet.round.id,
        playerId: bet.playerId,
        username: bet.username,
        amountCents: Number(bet.amountCents),
        status: bet.status,
      });
    });
  }

  @MessagePattern("wallet.debit.failed")
  async onDebitFailed(@Payload() msg: DebitFailedMsg): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      const bet = await this.betRepo.findById(msg.betId);
      if (!bet || bet.status !== BetStatus.PENDING) return;

      bet.cancel();
      await this.betRepo.save(bet);

      this.gameGateway.emitBetCancelled({
        betId: bet.id,
        playerId: bet.playerId,
        reason: msg.reason,
      });
    });
  }

  @MessagePattern("wallet.credit.success")
  async onCreditSuccess(@Payload() _msg: unknown): Promise<void> {
    // audit only
  }

  @MessagePattern("wallet.credit.failed")
  async onCreditFailed(@Payload() msg: unknown): Promise<void> {
    console.error("wallet.credit.failed received:", msg);
  }
}
