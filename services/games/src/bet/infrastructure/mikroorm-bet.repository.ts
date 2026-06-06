import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { Bet, BetStatus } from "../domain/bet.entity";
import { BetRepository } from "../domain/bet.repository";

@Injectable()
export class MikroOrmBetRepository implements BetRepository {
  constructor(private readonly em: EntityManager) {}

  async findActiveByRoundId(roundId: string): Promise<Bet[]> {
    return this.em.find(Bet, {
      round: roundId,
      status: { $in: [BetStatus.CONFIRMED, BetStatus.PENDING] },
    });
  }
}
