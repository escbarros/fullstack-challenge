import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { Outbox, OutboxEventType, OutboxStatus } from '@/outbox/domain/outbox.entity';
import { OutboxAlreadySentError } from '@/outbox/domain/errors/outbox-already-sent.error';
import { OutboxAlreadyFailedError } from '@/outbox/domain/errors/outbox-already-failed.error';

function makeOutbox(overrides: Partial<Outbox> = {}): Outbox {
  return Object.assign(new Outbox(), {
    eventType: OutboxEventType.WALLET_DEBIT,
    payload: {},
    idempotencyKey: 'wallet.debit:bet-uuid',
    status: OutboxStatus.PENDING,
    retryCount: 0,
    ...overrides,
  });
}

describe('Outbox.buildWalletDebitMessage()', () => {
  it('[UT-GS-033] includes all required fields in the payload', () => {
    const outbox = Outbox.buildWalletDebitMessage({
      betId: 'bet-uuid',
      playerId: 'player-uuid',
      amountCents: 1000,
    });

    const payload = outbox.payload as { meta: Record<string, unknown>; data: Record<string, unknown> };

    expect(payload.meta.eventId).toBeDefined();
    expect(payload.meta.eventType).toBe(OutboxEventType.WALLET_DEBIT);
    expect(payload.meta.idempotencyKey).toBeDefined();
    expect(payload.meta.publishedAt).toBeDefined();
    expect(payload.data.betId).toBe('bet-uuid');
    expect(payload.data.playerId).toBe('player-uuid');
    expect(payload.data.amountCents).toBe(1000);
  });

  it('[UT-GS-035] idempotency key has format wallet.debit:{betId}', () => {
    const outbox = Outbox.buildWalletDebitMessage({
      betId: 'bet-uuid',
      playerId: 'player-uuid',
      amountCents: 1000,
    });

    expect(outbox.idempotencyKey).toBe('wallet.debit:bet-uuid');
  });

  it('[UT-GS-037] starts with retryCount = 0', () => {
    const outbox = Outbox.buildWalletDebitMessage({
      betId: 'bet-uuid',
      playerId: 'player-uuid',
      amountCents: 1000,
    });

    expect(outbox.retryCount).toBe(0);
  });
});

describe('Outbox.buildWalletCreditMessage()', () => {
  it('[UT-GS-034] includes all required fields in the payload', () => {
    const outbox = Outbox.buildWalletCreditMessage({
      betId: 'bet-uuid',
      playerId: 'player-uuid',
      payoutCents: 2340,
      cashoutMultiplier: 2.34,
    });

    const payload = outbox.payload as { meta: Record<string, unknown>; data: Record<string, unknown> };

    expect(payload.meta.eventId).toBeDefined();
    expect(payload.meta.eventType).toBe(OutboxEventType.WALLET_CREDIT);
    expect(payload.meta.idempotencyKey).toBeDefined();
    expect(payload.meta.publishedAt).toBeDefined();
    expect(payload.data.betId).toBe('bet-uuid');
    expect(payload.data.playerId).toBe('player-uuid');
    expect(payload.data.payoutCents).toBe(2340);
    expect(payload.data.cashoutMultiplier).toBe(2.34);
  });

  it('[UT-GS-036] idempotency key has format wallet.credit:{betId}', () => {
    const outbox = Outbox.buildWalletCreditMessage({
      betId: 'bet-uuid',
      playerId: 'player-uuid',
      payoutCents: 2340,
      cashoutMultiplier: 2.34,
    });

    expect(outbox.idempotencyKey).toBe('wallet.credit:bet-uuid');
  });
});

describe('Outbox entity', () => {
  describe('initial state', () => {
    it('[UT-GS-081] sentAt is null when status is pending', () => {
      expect(makeOutbox().sentAt).toBeUndefined();
    });

    it('[UT-GS-082] sentAt is null when status is failed', () => {
      const outbox = makeOutbox({ status: OutboxStatus.FAILED });
      expect(outbox.sentAt).toBeUndefined();
    });

    it('[UT-GS-083] retryCount is never negative', () => {
      expect(makeOutbox().retryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markAsSent()', () => {
    it('[UT-GS-073] transitions status from pending to sent', () => {
      const outbox = makeOutbox();
      outbox.markAsSent();
      expect(outbox.status).toBe(OutboxStatus.SENT);
    });

    it('[UT-GS-074] sets sentAt to a non-null Date', () => {
      const outbox = makeOutbox();
      outbox.markAsSent();
      expect(outbox.sentAt).toBeInstanceOf(Date);
    });

    it('[UT-GS-075] throws OutboxAlreadySentError when already sent', () => {
      const outbox = makeOutbox({ status: OutboxStatus.SENT });
      expect(() => outbox.markAsSent()).toThrow(OutboxAlreadySentError);
    });

    it('[UT-GS-076] throws OutboxAlreadyFailedError when status is failed', () => {
      const outbox = makeOutbox({ status: OutboxStatus.FAILED });
      expect(() => outbox.markAsSent()).toThrow(OutboxAlreadyFailedError);
    });
  });

  describe('markAsFailed()', () => {
    it('[UT-GS-077] transitions status from pending to failed', () => {
      const outbox = makeOutbox();
      outbox.markAsFailed();
      expect(outbox.status).toBe(OutboxStatus.FAILED);
    });

    it('[UT-GS-078] throws OutboxAlreadySentError when status is sent', () => {
      const outbox = makeOutbox({ status: OutboxStatus.SENT });
      expect(() => outbox.markAsFailed()).toThrow(OutboxAlreadySentError);
    });
  });

  describe('incrementRetry()', () => {
    it('[UT-GS-079] increases retryCount by 1', () => {
      const outbox = makeOutbox();
      outbox.incrementRetry();
      expect(outbox.retryCount).toBe(1);
      outbox.incrementRetry();
      expect(outbox.retryCount).toBe(2);
    });

    it('[UT-GS-080] keeps status as pending', () => {
      const outbox = makeOutbox();
      outbox.incrementRetry();
      expect(outbox.status).toBe(OutboxStatus.PENDING);
    });

    it('throws OutboxAlreadySentError when status is sent', () => {
      const outbox = makeOutbox({ status: OutboxStatus.SENT });
      expect(() => outbox.incrementRetry()).toThrow(OutboxAlreadySentError);
    });

    it('throws OutboxAlreadyFailedError when status is failed', () => {
      const outbox = makeOutbox({ status: OutboxStatus.FAILED });
      expect(() => outbox.incrementRetry()).toThrow(OutboxAlreadyFailedError);
    });
  });
});
