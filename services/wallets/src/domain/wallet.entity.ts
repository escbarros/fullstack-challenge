import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { WalletTransaction } from "./wallet-transaction.entity";

@Entity({ tableName: "wallets" })
export class Wallet {
  static readonly INITIAL_BALANCE_CENTS = 10_000;

  @PrimaryKey({ type: "uuid" })
  id: string = crypto.randomUUID();

  @Property({ type: "uuid", unique: true })
  playerId!: string;

  @Property({ type: "bigint" })
  balanceCents: string = String(Wallet.INITIAL_BALANCE_CENTS);

  @OneToMany(() => WalletTransaction, (tx) => tx.wallet)
  transactions = new Collection<WalletTransaction>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), onCreate: () => new Date() })
  updatedAt: Date = new Date();

  static create(playerId: string): Wallet {
    const wallet = new Wallet();
    wallet.playerId = playerId;
    return wallet;
  }
}
