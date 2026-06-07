import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Outbox } from "./domain/outbox.entity";
import { OutboxRepository } from "./domain/outbox.repository";
import { MikroOrmOutboxRepository } from "./infrastructure/mikroorm-outbox.repository";
import { GameRabbitMQPublisher, WALLET_EVENTS_CLIENT } from "./infrastructure/game-rabbitmq.publisher";
import { OutboxPoller } from "./infrastructure/outbox.poller";
import type { Env } from "../utils/env";

@Module({
  imports: [
    MikroOrmModule.forFeature([Outbox]),
    ClientsModule.registerAsync([
      {
        name: WALLET_EVENTS_CLIENT,
        imports: [ConfigModule],
        useFactory: (config: ConfigService<Env, true>) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get("RABBITMQ_URL") as string],
            queue: "wallet_queue",
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    OutboxPoller,
    GameRabbitMQPublisher,
    {
      provide: OutboxRepository,
      useClass: MikroOrmOutboxRepository,
    },
  ],
  exports: [OutboxRepository, GameRabbitMQPublisher],
})
export class OutboxModule {}
