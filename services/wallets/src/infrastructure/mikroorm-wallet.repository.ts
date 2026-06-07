import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { Wallet } from "../domain/wallet.entity";
import { WalletTransaction } from "../domain/wallet-transaction.entity";
import { WalletRepository } from "../domain/wallet.repository";

@Injectable()
export class MikroOrmWalletRepository implements WalletRepository {
  constructor(private readonly em: EntityManager) {}

  findByPlayerId(playerId: string): Promise<Wallet | null> {
    return this.em.findOne(Wallet, { playerId });
  }

  async existsTransaction(idempotencyKey: string): Promise<boolean> {
    const count = await this.em.count(WalletTransaction, { idempotencyKey });
    return count > 0;
  }

  async save(wallet: Wallet, transaction: WalletTransaction): Promise<void> {
    this.em.persist(wallet);
    this.em.persist(transaction);
    await this.em.flush();
  }

  async saveWallet(wallet: Wallet): Promise<void> {
    await this.em.persist(wallet).flush();
  }
}
