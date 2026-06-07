import "reflect-metadata";
import { describe, it, expect } from "vitest";
import { Wallet } from "@/domain/wallet.entity";
import { InsufficientBalanceError } from "@/domain/errors/insufficient-balance.error";
import { DebitAmountTooLowError } from "@/domain/errors/debit-amount-too-low.error";
import { DebitAmountTooHighError } from "@/domain/errors/debit-amount-too-high.error";
import { InvalidCreditAmountError } from "@/domain/errors/invalid-credit-amount.error";

function makeWallet(balanceCents = "10000"): Wallet {
  return Object.assign(new Wallet(), {
    playerId: "player-uuid",
    balanceCents,
  });
}

describe("Wallet.debit()", () => {
  describe("balance operations", () => {
    it("[UT-WS-001] subtracts the debit amount from the balance correctly", () => {
      const wallet = makeWallet("150000");
      wallet.debit(1000n, "key-001");
      expect(wallet.balanceCents).toBe("149000");
    });

    it("[UT-WS-002] throws InsufficientBalanceError when amount exceeds balance", () => {
      const wallet = makeWallet("500");
      expect(() => wallet.debit(1000n, "key-002")).toThrow(InsufficientBalanceError);
    });

    it("[UT-WS-003] throws DebitAmountTooLowError for amount = 0", () => {
      const wallet = makeWallet();
      expect(() => wallet.debit(0n, "key-003")).toThrow(DebitAmountTooLowError);
    });

    it("[UT-WS-004] throws DebitAmountTooLowError for negative amount", () => {
      const wallet = makeWallet();
      expect(() => wallet.debit(-1n, "key-004")).toThrow(DebitAmountTooLowError);
    });

    it("[UT-WS-008] balance never goes negative — unchanged after a failed debit", () => {
      const wallet = makeWallet("500");
      expect(() => wallet.debit(501n, "key-008")).toThrow(InsufficientBalanceError);
      expect(wallet.balanceCents).toBe("500");
    });

    it("[UT-WS-009] debit with amount equal to balance produces zero balance", () => {
      const wallet = makeWallet("1000");
      wallet.debit(1000n, "key-009");
      expect(wallet.balanceCents).toBe("0");
    });
  });

  describe("amount constraints", () => {
    it("[UT-WS-013b] throws DebitAmountTooLowError for amount below minimum (99)", () => {
      const wallet = makeWallet();
      expect(() => wallet.debit(99n, "key-013b")).toThrow(DebitAmountTooLowError);
    });

    it("[UT-WS-013c] throws DebitAmountTooHighError for amount above maximum (100 001)", () => {
      const wallet = makeWallet("500000");
      expect(() => wallet.debit(100_001n, "key-013c")).toThrow(DebitAmountTooHighError);
    });
  });
});

describe("Wallet.credit()", () => {
  it("[UT-WS-005] adds the credit amount to the balance correctly", () => {
    const wallet = makeWallet("149000");
    wallet.credit(2340n, "key-005");
    expect(wallet.balanceCents).toBe("151340");
  });

  it("[UT-WS-006] throws InvalidCreditAmountError for amount = 0", () => {
    const wallet = makeWallet();
    expect(() => wallet.credit(0n, "key-006")).toThrow(InvalidCreditAmountError);
  });

  it("[UT-WS-007] throws InvalidCreditAmountError for negative amount", () => {
    const wallet = makeWallet();
    expect(() => wallet.credit(-1n, "key-007")).toThrow(InvalidCreditAmountError);
  });
});

describe("Wallet.isAlreadyProcessed()", () => {
  it("[UT-WS-010] returns true for an idempotency key that was already processed", () => {
    const wallet = makeWallet();
    wallet.debit(100n, "existing-key");
    expect(wallet.isAlreadyProcessed("existing-key")).toBe(true);
  });

  it("[UT-WS-011] returns false for an idempotency key that has not been processed", () => {
    const wallet = makeWallet();
    expect(wallet.isAlreadyProcessed("brand-new-key")).toBe(false);
  });

  it("[UT-WS-012] processing the same debit event twice only debits once", () => {
    const wallet = makeWallet("10000");
    const key = "debit-idempotent-key";

    if (!wallet.isAlreadyProcessed(key)) wallet.debit(1000n, key);
    if (!wallet.isAlreadyProcessed(key)) wallet.debit(1000n, key); // ignored

    expect(wallet.balanceCents).toBe("9000");
  });

  it("[UT-WS-013] processing the same credit event twice only credits once", () => {
    const wallet = makeWallet("10000");
    const key = "credit-idempotent-key";

    if (!wallet.isAlreadyProcessed(key)) wallet.credit(2500n, key);
    if (!wallet.isAlreadyProcessed(key)) wallet.credit(2500n, key); // ignored

    expect(wallet.balanceCents).toBe("12500");
  });
});
