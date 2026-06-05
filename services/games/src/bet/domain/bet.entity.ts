import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Round } from '../../round/domain/round.entity';

export enum BetStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CASHEDOUT = 'cashedout',
  LOST = 'lost',
  CANCELLED = 'cancelled',
}

@Entity({ tableName: 'bets' })
export class Bet {
  @PrimaryKey({ type: 'uuid' })
  id: string = crypto.randomUUID();

  @ManyToOne(() => Round)
  round!: Round;

  @Property({ type: 'uuid', index: true })
  playerId!: string;

  @Property({ type: 'bigint' })
  amountCents!: string;

  @Enum({ items: () => BetStatus, default: BetStatus.PENDING })
  status: BetStatus = BetStatus.PENDING;

  @Property({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cashoutMultiplier?: string;

  @Property({ type: 'bigint', nullable: true })
  payoutCents?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), onCreate: () => new Date() })
  updatedAt: Date = new Date();
}