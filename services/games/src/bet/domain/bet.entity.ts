import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Round } from '../../round/domain/round.entity';
import { AmountTooLowError } from './errors/amount-too-low.error';
import { AmountTooHighError } from './errors/amount-too-high.error';
import { BetCannotBeConfirmedError } from './errors/bet-cannot-be-confirmed.error';
import { BetCannotBeCancelledError } from './errors/bet-cannot-be-cancelled.error';
import { BetCannotBeLostError } from './errors/bet-cannot-be-lost.error';
import { BetCannotCashOutError } from './errors/bet-cannot-cash-out.error';

export enum BetStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CASHEDOUT = 'cashedout',
  LOST = 'lost',
  CANCELLED = 'cancelled',
}

@Entity({ tableName: 'bets' })
export class Bet {
  static readonly MIN_BET_CENTS = 100;
  static readonly MAX_BET_CENTS = 100_000;

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

  static validateBetAmount(amountCents: number): void {
    if (amountCents < Bet.MIN_BET_CENTS) throw new AmountTooLowError();
    if (amountCents > Bet.MAX_BET_CENTS) throw new AmountTooHighError();
  }

  static isDuplicateBet(existingBets: Bet[]): boolean {
    return existingBets.some(
      (b) => b.status === BetStatus.PENDING || b.status === BetStatus.CONFIRMED,
    );
  }

  confirm(): void {
    if (this.status !== BetStatus.PENDING) {
      throw new BetCannotBeConfirmedError(this.status);
    }
    this.status = BetStatus.CONFIRMED;
  }

  cancel(): void {
    if (this.status !== BetStatus.PENDING) {
      throw new BetCannotBeCancelledError(this.status);
    }
    this.status = BetStatus.CANCELLED;
  }

  markAsLost(): void {
    if (this.status !== BetStatus.CONFIRMED) {
      throw new BetCannotBeLostError(this.status);
    }
    this.status = BetStatus.LOST;
  }

  applyCashout(multiplier: number): void {
    if (this.status !== BetStatus.CONFIRMED) {
      throw new BetCannotCashOutError(this.status);
    }
    this.status = BetStatus.CASHEDOUT;
    this.cashoutMultiplier = String(multiplier);
    this.payoutCents = String(this.calculatePayout(multiplier));
  }

  calculatePayout(multiplier: number): number {
    return Math.floor(Number(this.amountCents) * multiplier);
  }
}
