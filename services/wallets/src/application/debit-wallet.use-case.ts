import { Injectable, Logger } from "@nestjs/common";
import { WalletRepository } from "../domain/wallet.repository";
import { InsufficientBalanceError } from "../domain/errors/insufficient-balance.error";
import { WalletRabbitMQPublisher } from "../infrastructure/wallet-rabbitmq.publisher";

interface DebitParams {
  betId: string;
  playerId: string;
  amountCents: number;
  idempotencyKey: string;
}

@Injectable()
export class DebitWalletUseCase {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly publisher: WalletRabbitMQPublisher,
  ) {}

  async execute(params: DebitParams): Promise<void> {
    const { betId, playerId, amountCents, idempotencyKey } = params;

    if (await this.walletRepo.existsTransaction(idempotencyKey)) return;

    const wallet = await this.walletRepo.findByPlayerId(playerId);
    if (!wallet) {
      this.publisher.emitDebitFailed({ betId, playerId, reason: "WALLET_NOT_FOUND" });
      return;
    }

    try {
      const tx = wallet.debit(BigInt(amountCents), idempotencyKey);
      await this.walletRepo.save(wallet, tx);
      this.publisher.emitDebitSuccess({ betId, playerId, balanceCents: wallet.balanceCents });
    } catch (error) {
      const reason =
        error instanceof InsufficientBalanceError ? "INSUFFICIENT_BALANCE" : "INTERNAL_ERROR";
      this.publisher.emitDebitFailed({ betId, playerId, reason });
    }
  }
}
