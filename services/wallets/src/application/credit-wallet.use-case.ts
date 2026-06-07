import { Injectable } from "@nestjs/common";
import { WalletRepository } from "../domain/wallet.repository";
import { WalletRabbitMQPublisher } from "../infrastructure/wallet-rabbitmq.publisher";

interface CreditParams {
  betId: string;
  playerId: string;
  payoutCents: number;
  idempotencyKey: string;
}

@Injectable()
export class CreditWalletUseCase {
  constructor(
    private readonly walletRepo: WalletRepository,
    private readonly publisher: WalletRabbitMQPublisher,
  ) {}

  async execute(params: CreditParams): Promise<void> {
    const { betId, playerId, payoutCents, idempotencyKey } = params;

    if (await this.walletRepo.existsTransaction(idempotencyKey)) return;

    const wallet = await this.walletRepo.findByPlayerId(playerId);
    if (!wallet) {
      this.publisher.emitCreditFailed({ betId, playerId, reason: "WALLET_NOT_FOUND" });
      return;
    }

    try {
      const tx = wallet.credit(BigInt(payoutCents), idempotencyKey);
      await this.walletRepo.save(wallet, tx);
      this.publisher.emitCreditSuccess({ betId, playerId, balanceCents: wallet.balanceCents });
    } catch {
      this.publisher.emitCreditFailed({ betId, playerId, reason: "INTERNAL_ERROR" });
    }
  }
}
