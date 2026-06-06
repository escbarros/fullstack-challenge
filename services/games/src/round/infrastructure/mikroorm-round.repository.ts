import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { LockMode } from "@mikro-orm/core";
import { RoundRepository } from "../domain/round.repository";
import { Round, RoundStatus } from "../domain/round.entity";

@Injectable()
export class MikroOrmRoundRepository implements RoundRepository {
  constructor(private readonly em: EntityManager) {}

  async save(round: Round): Promise<void> {
    await this.em.persist(round).flush();
  }

  async findCurrent(): Promise<Round | null> {
    return this.em.findOne(
      Round,
      { status: { $in: [RoundStatus.BETTING, RoundStatus.ACTIVE] } },
      { orderBy: { createdAt: "DESC" } }
    );
  }

  async findById(id: string): Promise<Round | null> {
    return this.em.findOne(Round, { id });
  }

  async findWithLock(id: string): Promise<Round | null> {
    return this.em.findOne(
      Round,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE }
    );
  }

  async findHistory(
    limit: number,
    offset: number,
  ): Promise<{ items: Round[]; total: number }> {
    const [items, total] = await this.em.findAndCount(
      Round,
      { status: RoundStatus.CRASHED },
      { limit, offset, orderBy: { createdAt: "DESC" } }
    );
    return { items, total };
  }
}
