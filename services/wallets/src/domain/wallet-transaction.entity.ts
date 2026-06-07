import {
  Entity,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from "@mikro-orm/core";
import { Wallet } from "./wallet.entity";

export enum WalletOperation {
  DEBIT = "debit",
  CREDIT = "credit",
}

@Entity({ tableName: "wallet_transactions" })
export class WalletTransaction {
  @PrimaryKey({ type: "uuid" })
  id: string = crypto.randomUUID();

  @ManyToOne(() => Wallet)
  wallet!: Wallet;

  @Property({ length: 255, unique: true })
  idempotencyKey!: string;

  @Enum({ items: () => WalletOperation })
  operation!: WalletOperation;

  @Property({ type: "bigint" })
  amountCents!: string;

  @Property({ type: "bigint" })
  balanceBeforeCents!: string;

  @Property({ type: "bigint" })
  balanceAfterCents!: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
