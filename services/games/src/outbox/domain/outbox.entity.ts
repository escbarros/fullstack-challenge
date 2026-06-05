import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { OutboxAlreadySentError } from './errors/outbox-already-sent.error';
import { OutboxAlreadyFailedError } from './errors/outbox-already-failed.error';

export enum OutboxStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum OutboxEventType {
  WALLET_DEBIT = 'wallet.debit',
  WALLET_CREDIT = 'wallet.credit',
  BET_CANCELLED = 'bet.cancelled',
}

interface OutboxPayload {
  meta: {
    eventId: string;
    eventType: string;
    idempotencyKey: string;
    publishedAt: string;
  };
  data: Record<string, unknown>;
}

@Entity({ tableName: 'outbox' })
export class Outbox {
  static readonly MAX_RETRY_COUNT = 3;

  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @Enum({ items: () => OutboxEventType })
  eventType!: OutboxEventType;

  @Property({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Enum({ items: () => OutboxStatus, default: OutboxStatus.PENDING })
  status: OutboxStatus = OutboxStatus.PENDING;

  @Property({ length: 255 })
  idempotencyKey!: string;

  @Property({ default: 0 })
  retryCount: number = 0;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ nullable: true })
  sentAt?: Date;

  static create(params: {
    eventType: OutboxEventType;
    payload: Record<string, unknown>;
    idempotencyKey: string;
  }): Outbox {
    const outbox = new Outbox();
    outbox.eventType = params.eventType;
    outbox.payload = params.payload;
    outbox.idempotencyKey = params.idempotencyKey;
    return outbox;
  }

  static buildWalletDebitMessage(params: {
    betId: string;
    playerId: string;
    amountCents: number | string;
  }): Outbox {
    const idempotencyKey = `wallet.debit:${params.betId}`;
    const payload: OutboxPayload = {
      meta: {
        eventId: crypto.randomUUID(),
        eventType: OutboxEventType.WALLET_DEBIT,
        idempotencyKey,
        publishedAt: new Date().toISOString(),
      },
      data: {
        betId: params.betId,
        playerId: params.playerId,
        amountCents: params.amountCents,
      },
    };
    return Outbox.create({
      eventType: OutboxEventType.WALLET_DEBIT,
      payload: payload as unknown as Record<string, unknown>,
      idempotencyKey,
    });
  }

  static buildWalletCreditMessage(params: {
    betId: string;
    playerId: string;
    payoutCents: number | string;
    cashoutMultiplier: number | string;
  }): Outbox {
    const idempotencyKey = `wallet.credit:${params.betId}`;
    const payload: OutboxPayload = {
      meta: {
        eventId: crypto.randomUUID(),
        eventType: OutboxEventType.WALLET_CREDIT,
        idempotencyKey,
        publishedAt: new Date().toISOString(),
      },
      data: {
        betId: params.betId,
        playerId: params.playerId,
        payoutCents: params.payoutCents,
        cashoutMultiplier: params.cashoutMultiplier,
      },
    };
    return Outbox.create({
      eventType: OutboxEventType.WALLET_CREDIT,
      payload: payload as unknown as Record<string, unknown>,
      idempotencyKey,
    });
  }

  markAsSent(): void {
    if (this.status === OutboxStatus.SENT) {
      throw new OutboxAlreadySentError();
    }
    if (this.status === OutboxStatus.FAILED) {
      throw new OutboxAlreadyFailedError();
    }
    this.status = OutboxStatus.SENT;
    this.sentAt = new Date();
  }

  markAsFailed(): void {
    if (this.status === OutboxStatus.SENT) {
      throw new OutboxAlreadySentError();
    }
    this.status = OutboxStatus.FAILED;
  }

  incrementRetry(): void {
    if (this.status === OutboxStatus.SENT) {
      throw new OutboxAlreadySentError();
    }
    if (this.status === OutboxStatus.FAILED) {
      throw new OutboxAlreadyFailedError();
    }
    this.retryCount += 1;
  }

  canRetry(): boolean {
    return this.retryCount < Outbox.MAX_RETRY_COUNT;
  }
}
