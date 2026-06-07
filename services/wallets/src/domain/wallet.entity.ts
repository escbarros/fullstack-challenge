import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { WalletTransaction, WalletOperation } from "./wallet-transaction.entity";
import { InsufficientBalanceError } from "./errors/insufficient-balance.error";
import { DebitAmountTooLowError } from "./errors/debit-amount-too-low.error";
import { DebitAmountTooHighError } from "./errors/debit-amount-too-high.error";
import { InvalidCreditAmountError } from "./errors/invalid-credit-amount.error";

@Entity({ tableName: "wallets" })
export class Wallet {
  static readonly INITIAL_BALANCE_CENTS = 10_000;
  static readonly MIN_DEBIT_CENTS = 100;
  static readonly MAX_DEBIT_CENTS = 100_000;

  @PrimaryKey({ type: "uuid" })
  id: string = crypto.randomUUID();

  @Property({ type: "uuid", unique: true })
  playerId!: string;

  @Property({ type: "bigint" })
  balanceCents: string = String(Wallet.INITIAL_BALANCE_CENTS);

  @OneToMany(() => WalletTransaction, (tx) => tx.wallet)
  transactions = new Collection<WalletTransaction>(this);

  private readonly _transactions: WalletTransaction[] = [];

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), onCreate: () => new Date() })
  updatedAt: Date = new Date();

  static create(playerId: string): Wallet {
    const wallet = new Wallet();
    wallet.playerId = playerId;
    return wallet;
  }

  private initTransactions() {
    if (!this._transactions) {
      (this as any)._transactions = [];
    }
  }

  debit(amountCents: bigint, idempotencyKey: string): WalletTransaction {
    if (amountCents < BigInt(Wallet.MIN_DEBIT_CENTS)) throw new DebitAmountTooLowError();
    if (amountCents > BigInt(Wallet.MAX_DEBIT_CENTS)) throw new DebitAmountTooHighError();

    const before = BigInt(this.balanceCents);
    if (before < amountCents) throw new InsufficientBalanceError();

    const after = before - amountCents;
    this.balanceCents = String(after);

    const tx = new WalletTransaction();
    tx.wallet = this;
    tx.idempotencyKey = idempotencyKey;
    tx.operation = WalletOperation.DEBIT;
    tx.amountCents = String(amountCents);
    tx.balanceBeforeCents = String(before);
    tx.balanceAfterCents = String(after);

    this.initTransactions();
    this._transactions.push(tx);
    return tx;
  }

  credit(amountCents: bigint, idempotencyKey: string): WalletTransaction {
    if (amountCents <= 0n) throw new InvalidCreditAmountError();

    const before = BigInt(this.balanceCents);
    const after = before + amountCents;
    this.balanceCents = String(after);

    const tx = new WalletTransaction();
    tx.wallet = this;
    tx.idempotencyKey = idempotencyKey;
    tx.operation = WalletOperation.CREDIT;
    tx.amountCents = String(amountCents);
    tx.balanceBeforeCents = String(before);
    tx.balanceAfterCents = String(after);

    this.initTransactions();
    this._transactions.push(tx);
    return tx;
  }

  isAlreadyProcessed(idempotencyKey: string): boolean {
    this.initTransactions();
    return this._transactions.some((tx) => tx.idempotencyKey === idempotencyKey);
  }
}
