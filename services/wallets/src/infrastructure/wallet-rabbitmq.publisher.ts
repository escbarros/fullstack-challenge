import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

export const WALLET_EVENTS_CLIENT = "WALLET_EVENTS_CLIENT";

interface DebitSuccessPayload {
  betId: string;
  playerId: string;
  balanceCents: string;
}

interface DebitFailedPayload {
  betId: string;
  playerId: string;
  reason: string;
}

interface CreditSuccessPayload {
  betId: string;
  playerId: string;
  balanceCents: string;
}

interface CreditFailedPayload {
  betId: string;
  playerId: string;
  reason: string;
}

@Injectable()
export class WalletRabbitMQPublisher {
  constructor(
    @Inject(WALLET_EVENTS_CLIENT) private readonly client: ClientProxy,
  ) {}

  emitDebitSuccess(payload: DebitSuccessPayload): void {
    this.client.emit("wallet.debit.success", payload);
  }

  emitDebitFailed(payload: DebitFailedPayload): void {
    this.client.emit("wallet.debit.failed", payload);
  }

  emitCreditSuccess(payload: CreditSuccessPayload): void {
    this.client.emit("wallet.credit.success", payload);
  }

  emitCreditFailed(payload: CreditFailedPayload): void {
    this.client.emit("wallet.credit.failed", payload);
  }
}
