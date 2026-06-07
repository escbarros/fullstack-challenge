import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { CreateRequestContext, MikroORM } from "@mikro-orm/core";
import { DebitWalletUseCase } from "../application/debit-wallet.use-case";
import { CreditWalletUseCase } from "../application/credit-wallet.use-case";

interface WalletDebitMessage {
  meta: { idempotencyKey: string; eventId: string; eventType: string; publishedAt: string };
  data: { betId: string; playerId: string; amountCents: number };
}

interface WalletCreditMessage {
  meta: { idempotencyKey: string; eventId: string; eventType: string; publishedAt: string };
  data: { betId: string; playerId: string; payoutCents: number; cashoutMultiplier: string };
}

@Controller()
export class WalletConsumer {
  constructor(
    private readonly orm: MikroORM,
    private readonly debitUseCase: DebitWalletUseCase,
    private readonly creditUseCase: CreditWalletUseCase,
  ) {}

  @MessagePattern("wallet.debit")
  @CreateRequestContext()
  async handleDebit(@Payload() message: WalletDebitMessage): Promise<void> {
    await this.debitUseCase.execute({
      betId: message.data.betId,
      playerId: message.data.playerId,
      amountCents: Number(message.data.amountCents),
      idempotencyKey: message.meta.idempotencyKey,
    });
  }

  @MessagePattern("wallet.credit")
  @CreateRequestContext()
  async handleCredit(@Payload() message: WalletCreditMessage): Promise<void> {
    await this.creditUseCase.execute({
      betId: message.data.betId,
      playerId: message.data.playerId,
      payoutCents: Number(message.data.payoutCents),
      idempotencyKey: message.meta.idempotencyKey,
    });
  }
}
