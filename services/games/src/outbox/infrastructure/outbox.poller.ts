import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { MikroORM, RequestContext } from "@mikro-orm/core";
import { OutboxRepository } from "../domain/outbox.repository";
import { GameRabbitMQPublisher } from "./game-rabbitmq.publisher";

@Injectable()
export class OutboxPoller {
  private readonly logger = new Logger(OutboxPoller.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly outboxRepo: OutboxRepository,
    private readonly publisher: GameRabbitMQPublisher,
  ) {}

  @Interval(2000)
  async poll(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      const pending = await this.outboxRepo.findPending(10);

      for (const record of pending) {
        try {
          this.publisher.publish(record.eventType, record.payload as Record<string, unknown>);
          record.markAsSent();
        } catch (err) {
          this.logger.error(`Failed to publish outbox record ${record.id}: ${String(err)}`);
          if (record.canRetry()) {
            record.incrementRetry();
          } else {
            record.markAsFailed();
          }
        }
        await this.outboxRepo.save(record);
      }
    });
  }
}
