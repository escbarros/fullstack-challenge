import { Injectable } from "@nestjs/common";
import { Wallet } from "../domain/wallet.entity";
import { WalletRepository } from "../domain/wallet.repository";

interface CreateWalletResult {
  id: string;
  playerId: string;
  balanceCents: string;
  created: boolean;
}

@Injectable()
export class CreateWalletUseCase {
  constructor(private readonly walletRepo: WalletRepository) {}

  async execute(playerId: string): Promise<CreateWalletResult> {
    const existing = await this.walletRepo.findByPlayerId(playerId);
    if (existing) {
      return {
        id: existing.id,
        playerId: existing.playerId,
        balanceCents: existing.balanceCents,
        created: false,
      };
    }

    const wallet = Wallet.create(playerId);
    await this.walletRepo.saveWallet(wallet);
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balanceCents: wallet.balanceCents,
      created: true,
    };
  }
}
