import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Bet, BetStatus } from '@/bet/domain/bet.entity';
import { AmountTooLowError } from '@/bet/domain/errors/amount-too-low.error';
import { AmountTooHighError } from '@/bet/domain/errors/amount-too-high.error';
import { BetCannotBeConfirmedError } from '@/bet/domain/errors/bet-cannot-be-confirmed.error';
import { BetCannotBeCancelledError } from '@/bet/domain/errors/bet-cannot-be-cancelled.error';
import { BetCannotBeLostError } from '@/bet/domain/errors/bet-cannot-be-lost.error';
import { BetCannotCashOutError } from '@/bet/domain/errors/bet-cannot-cash-out.error';

function makeBet(overrides: Partial<Bet> = {}): Bet {
  return Object.assign(new Bet(), {
    playerId: 'player-uuid',
    amountCents: '1000',
    status: BetStatus.PENDING,
    ...overrides,
  });
}

describe('Bet.validateBetAmount()', () => {
  it('[UT-GS-022] accepts a value within the allowed range', () => {
    expect(() => Bet.validateBetAmount(100)).not.toThrow();
    expect(() => Bet.validateBetAmount(50_000)).not.toThrow();
    expect(() => Bet.validateBetAmount(100_000)).not.toThrow();
  });

  it('[UT-GS-023] rejects a value below the minimum — throws AmountTooLowError', () => {
    expect(() => Bet.validateBetAmount(99)).toThrow(AmountTooLowError);
  });

  it('[UT-GS-024] rejects a value above the maximum — throws AmountTooHighError', () => {
    expect(() => Bet.validateBetAmount(100_001)).toThrow(AmountTooHighError);
  });

  it('[UT-GS-025] rejects zero — throws AmountTooLowError', () => {
    expect(() => Bet.validateBetAmount(0)).toThrow(AmountTooLowError);
  });

  it('[UT-GS-026] rejects a negative value — throws AmountTooLowError', () => {
    expect(() => Bet.validateBetAmount(-1)).toThrow(AmountTooLowError);
  });
});

describe('Bet.isDuplicateBet()', () => {
  it('[UT-GS-027] returns true when player already has an active bet in the round', () => {
    expect(Bet.isDuplicateBet([makeBet({ status: BetStatus.PENDING })])).toBe(true);
    expect(Bet.isDuplicateBet([makeBet({ status: BetStatus.CONFIRMED })])).toBe(true);
  });

  it('[UT-GS-028] returns false when player has no bet in the round', () => {
    expect(Bet.isDuplicateBet([])).toBe(false);
  });

  it('[UT-GS-029] ignores cancelled and lost bets', () => {
    expect(
      Bet.isDuplicateBet([
        makeBet({ status: BetStatus.CANCELLED }),
        makeBet({ status: BetStatus.LOST }),
      ]),
    ).toBe(false);
  });
});

describe('bet.calculatePayout()', () => {
  it('[UT-GS-030] returns amountCents × multiplier as integer cents', () => {
    const bet = makeBet({ amountCents: '1000' });
    expect(bet.calculatePayout(2.34)).toBe(2340);
  });

  it('[UT-GS-031] floors fractional cents', () => {
    const bet = makeBet({ amountCents: '1000' });
    expect(bet.calculatePayout(1.999)).toBe(1999);
  });

  it('[UT-GS-032] never returns less than the original amountCents', () => {
    const bet = makeBet({ amountCents: '1000' });
    expect(bet.calculatePayout(1.0)).toBe(1000);
  });
});

describe('Bet entity', () => {
  describe('initial state', () => {
    it('[UT-GS-057] cashoutMultiplier is undefined when bet is created', () => {
      expect(makeBet().cashoutMultiplier).toBeUndefined();
    });

    it('[UT-GS-058] payoutCents is undefined when bet is created', () => {
      expect(makeBet().payoutCents).toBeUndefined();
    });

    it('[UT-GS-059] payoutCents and cashoutMultiplier remain undefined after markAsLost()', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED });
      bet.markAsLost();
      expect(bet.payoutCents).toBeUndefined();
      expect(bet.cashoutMultiplier).toBeUndefined();
    });
  });

  describe('confirm()', () => {
    it('[UT-GS-043] transitions status from pending to confirmed', () => {
      const bet = makeBet();
      bet.confirm();
      expect(bet.status).toBe(BetStatus.CONFIRMED);
    });

    it('[UT-GS-044] throws BetCannotBeConfirmedError when already confirmed', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED });
      expect(() => bet.confirm()).toThrow(BetCannotBeConfirmedError);
    });

    it('[UT-GS-045] throws BetCannotBeConfirmedError when status is cancelled', () => {
      const bet = makeBet({ status: BetStatus.CANCELLED });
      expect(() => bet.confirm()).toThrow(BetCannotBeConfirmedError);
    });
  });

  describe('cancel()', () => {
    it('[UT-GS-046] transitions status from pending to cancelled', () => {
      const bet = makeBet();
      bet.cancel();
      expect(bet.status).toBe(BetStatus.CANCELLED);
    });

    it('[UT-GS-047] throws BetCannotBeCancelledError when status is confirmed', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED });
      expect(() => bet.cancel()).toThrow(BetCannotBeCancelledError);
    });

    it('[UT-GS-048] throws BetCannotBeCancelledError when status is cashedout or lost', () => {
      expect(() => makeBet({ status: BetStatus.CASHEDOUT }).cancel()).toThrow(BetCannotBeCancelledError);
      expect(() => makeBet({ status: BetStatus.LOST }).cancel()).toThrow(BetCannotBeCancelledError);
    });
  });

  describe('markAsLost()', () => {
    it('[UT-GS-049] transitions status from confirmed to lost', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED });
      bet.markAsLost();
      expect(bet.status).toBe(BetStatus.LOST);
    });

    it('[UT-GS-050] throws BetCannotBeLostError when status is pending', () => {
      expect(() => makeBet({ status: BetStatus.PENDING }).markAsLost()).toThrow(BetCannotBeLostError);
    });

    it('[UT-GS-051] throws BetCannotBeLostError when status is cashedout', () => {
      expect(() => makeBet({ status: BetStatus.CASHEDOUT }).markAsLost()).toThrow(BetCannotBeLostError);
    });
  });

  describe('applyCashout()', () => {
    it('[UT-GS-052] sets status to cashedout', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED });
      bet.applyCashout(2.34);
      expect(bet.status).toBe(BetStatus.CASHEDOUT);
    });

    it('[UT-GS-053] computes payoutCents as floor(amountCents × multiplier)', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED, amountCents: '1000' });
      bet.applyCashout(2.34);
      expect(bet.payoutCents).toBe('2340');

      const bet2 = makeBet({ status: BetStatus.CONFIRMED, amountCents: '1000' });
      bet2.applyCashout(1.999);
      expect(bet2.payoutCents).toBe('1999');
    });

    it('[UT-GS-054] persists cashoutMultiplier on the entity', () => {
      const bet = makeBet({ status: BetStatus.CONFIRMED });
      bet.applyCashout(2.34);
      expect(bet.cashoutMultiplier).toBe('2.34');
    });

    it('[UT-GS-055] throws BetCannotCashOutError when status is pending', () => {
      expect(() => makeBet({ status: BetStatus.PENDING }).applyCashout(2.0)).toThrow(BetCannotCashOutError);
    });

    it('[UT-GS-056] throws BetCannotCashOutError when status is lost', () => {
      expect(() => makeBet({ status: BetStatus.LOST }).applyCashout(2.0)).toThrow(BetCannotCashOutError);
    });
  });
});
