import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

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

  markAsSent(): void {
    this.status = OutboxStatus.SENT;
    this.sentAt = new Date();
  }

  markAsFailed(): void {
    this.status = OutboxStatus.FAILED;
    this.retryCount += 1;
  }

  canRetry(): boolean {
    return this.retryCount < Outbox.MAX_RETRY_COUNT;
  }
}
