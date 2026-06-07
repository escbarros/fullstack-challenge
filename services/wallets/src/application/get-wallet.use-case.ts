import { Injectable, NotFoundException } from "@nestjs/common";
import { WalletRepository } from "../domain/wallet.repository";

interface WalletDto {
  id: string;
  playerId: string;
  balanceCents: string;
}

@Injectable()
export class GetWalletUseCase {
  constructor(private readonly walletRepo: WalletRepository) {}

  async execute(playerId: string): Promise<WalletDto> {
    const wallet = await this.walletRepo.findByPlayerId(playerId);
    if (!wallet) throw new NotFoundException("Wallet not found");
    return { id: wallet.id, playerId: wallet.playerId, balanceCents: wallet.balanceCents };
  }
}
