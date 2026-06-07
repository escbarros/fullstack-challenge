import { Injectable } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/core";
import { Outbox, OutboxStatus } from "../domain/outbox.entity";
import { OutboxRepository } from "../domain/outbox.repository";

@Injectable()
export class MikroOrmOutboxRepository implements OutboxRepository {
  constructor(private readonly em: EntityManager) {}

  async findPending(limit: number): Promise<Outbox[]> {
    return this.em.find(
      Outbox,
      { status: OutboxStatus.PENDING },
      { limit, orderBy: { createdAt: "ASC" } },
    );
  }

  async save(outbox: Outbox): Promise<void> {
    await this.em.persist(outbox).flush();
  }
}
