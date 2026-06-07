import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { Bet, BetStatus } from "../domain/bet.entity";
import { BetRepository } from "../domain/bet.repository";
import { Outbox } from "../../outbox/domain/outbox.entity";

@Injectable()
export class MikroOrmBetRepository implements BetRepository {
  constructor(private readonly em: EntityManager) {}

  async findActiveByRoundId(roundId: string): Promise<Bet[]> {
    return this.em.find(Bet, {
      round: roundId,
      status: { $in: [BetStatus.CONFIRMED, BetStatus.PENDING] },
    });
  }

  async findActiveByRoundAndPlayer(roundId: string, playerId: string): Promise<Bet | null> {
    return this.em.findOne(Bet, {
      round: roundId,
      playerId: playerId,
      status: { $in: [BetStatus.CONFIRMED, BetStatus.PENDING] },
    });
  }

  async findById(id: string): Promise<Bet | null> {
    return this.em.findOne(Bet, { id }, { populate: ["round"] });
  }

  async findByPlayerAndRound(playerId: string, roundId: string): Promise<Bet[]> {
    return this.em.find(Bet, { playerId, round: roundId });
  }

  async save(bet: Bet): Promise<void> {
    await this.em.persist(bet).flush();
  }

  async saveBetWithOutbox(bet: Bet, outbox: Outbox): Promise<void> {
    this.em.persist(bet);
    this.em.persist(outbox);
    await this.em.flush();
  }
}
