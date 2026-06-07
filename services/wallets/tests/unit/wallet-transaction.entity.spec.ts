import "reflect-metadata";
import { describe, it, expect } from "vitest";
import { Wallet } from "@/domain/wallet.entity";
import { WalletOperation } from "@/domain/wallet-transaction.entity";

function makeWallet(balanceCents = "10000"): Wallet {
  return Object.assign(new Wallet(), {
    playerId: "player-uuid",
    balanceCents,
  });
}

describe("WalletOperation enum", () => {
  it("[UT-WT-001] DEBIT serialises to 'debit'", () => {
    expect(WalletOperation.DEBIT).toBe("debit");
  });

  it("[UT-WT-002] CREDIT serialises to 'credit'", () => {
    expect(WalletOperation.CREDIT).toBe("credit");
  });
});

describe("WalletTransaction defaults", () => {
  it("[UT-WT-003] id is auto-generated as a non-empty string on construction", () => {
    const wallet = makeWallet();
    const tx = wallet.debit(100n, "key-003");
    expect(typeof tx.id).toBe("string");
    expect(tx.id.length).toBeGreaterThan(0);
  });

  it("[UT-WT-004] each transaction receives a unique id", () => {
    const wallet = makeWallet("10000");
    const tx1 = wallet.debit(100n, "key-004a");
    const tx2 = wallet.debit(100n, "key-004b");
    expect(tx1.id).not.toBe(tx2.id);
  });

  it("[UT-WT-005] createdAt is set to a Date on construction", () => {
    const wallet = makeWallet();
    const tx = wallet.debit(100n, "key-005");
    expect(tx.createdAt).toBeInstanceOf(Date);
  });
});

describe("WalletTransaction produced by Wallet.debit()", () => {
  it("[UT-WT-006] operation is DEBIT", () => {
    const wallet = makeWallet();
    const tx = wallet.debit(500n, "key-006");
    expect(tx.operation).toBe(WalletOperation.DEBIT);
  });

  it("[UT-WT-007] idempotencyKey matches the provided key", () => {
    const wallet = makeWallet();
    const tx = wallet.debit(500n, "my-unique-key");
    expect(tx.idempotencyKey).toBe("my-unique-key");
  });

  it("[UT-WT-008] amountCents is stored as a string matching the debit amount", () => {
    const wallet = makeWallet();
    const tx = wallet.debit(1234n, "key-008");
    expect(tx.amountCents).toBe("1234");
  });

  it("[UT-WT-009] balanceBeforeCents reflects the balance prior to the debit", () => {
    const wallet = makeWallet("5000");
    const tx = wallet.debit(1000n, "key-009");
    expect(tx.balanceBeforeCents).toBe("5000");
  });

  it("[UT-WT-010] balanceAfterCents reflects the balance after the debit", () => {
    const wallet = makeWallet("5000");
    const tx = wallet.debit(1000n, "key-010");
    expect(tx.balanceAfterCents).toBe("4000");
  });

  it("[UT-WT-011] balanceAfterCents equals balanceBeforeCents minus amountCents", () => {
    const wallet = makeWallet("7500");
    const tx = wallet.debit(2300n, "key-011");
    const computed =
      BigInt(tx.balanceBeforeCents) - BigInt(tx.amountCents);
    expect(BigInt(tx.balanceAfterCents)).toBe(computed);
  });

  it("[UT-WT-012] wallet reference points to the owning wallet", () => {
    const wallet = makeWallet();
    const tx = wallet.debit(100n, "key-012");
    expect(tx.wallet).toBe(wallet);
  });
});

describe("WalletTransaction produced by Wallet.credit()", () => {
  it("[UT-WT-013] operation is CREDIT", () => {
    const wallet = makeWallet();
    const tx = wallet.credit(500n, "key-013");
    expect(tx.operation).toBe(WalletOperation.CREDIT);
  });

  it("[UT-WT-014] idempotencyKey matches the provided key", () => {
    const wallet = makeWallet();
    const tx = wallet.credit(500n, "credit-unique-key");
    expect(tx.idempotencyKey).toBe("credit-unique-key");
  });

  it("[UT-WT-015] amountCents is stored as a string matching the credit amount", () => {
    const wallet = makeWallet();
    const tx = wallet.credit(2340n, "key-015");
    expect(tx.amountCents).toBe("2340");
  });

  it("[UT-WT-016] balanceBeforeCents reflects the balance prior to the credit", () => {
    const wallet = makeWallet("3000");
    const tx = wallet.credit(1000n, "key-016");
    expect(tx.balanceBeforeCents).toBe("3000");
  });

  it("[UT-WT-017] balanceAfterCents reflects the balance after the credit", () => {
    const wallet = makeWallet("3000");
    const tx = wallet.credit(1000n, "key-017");
    expect(tx.balanceAfterCents).toBe("4000");
  });

  it("[UT-WT-018] balanceAfterCents equals balanceBeforeCents plus amountCents", () => {
    const wallet = makeWallet("8000");
    const tx = wallet.credit(1500n, "key-018");
    const computed =
      BigInt(tx.balanceBeforeCents) + BigInt(tx.amountCents);
    expect(BigInt(tx.balanceAfterCents)).toBe(computed);
  });

  it("[UT-WT-019] wallet reference points to the owning wallet", () => {
    const wallet = makeWallet();
    const tx = wallet.credit(100n, "key-019");
    expect(tx.wallet).toBe(wallet);
  });
});

describe("WalletTransaction audit trail across sequential operations", () => {
  it("[UT-WT-020] each operation records the correct before/after snapshot independently", () => {
    const wallet = makeWallet("10000");
    const debit = wallet.debit(2000n, "key-020a");
    const credit = wallet.credit(500n, "key-020b");

    expect(debit.balanceBeforeCents).toBe("10000");
    expect(debit.balanceAfterCents).toBe("8000");
    expect(credit.balanceBeforeCents).toBe("8000");
    expect(credit.balanceAfterCents).toBe("8500");
  });
});
