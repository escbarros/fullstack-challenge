import { Wallet } from "./wallet.entity";
import { WalletTransaction } from "./wallet-transaction.entity";

export abstract class WalletRepository {
  abstract findByPlayerId(playerId: string): Promise<Wallet | null>;
  abstract existsTransaction(idempotencyKey: string): Promise<boolean>;
  abstract save(wallet: Wallet, transaction: WalletTransaction): Promise<void>;
  abstract saveWallet(wallet: Wallet): Promise<void>;
}
