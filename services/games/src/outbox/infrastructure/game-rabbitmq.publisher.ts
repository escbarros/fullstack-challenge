import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

export const WALLET_EVENTS_CLIENT = "WALLET_EVENTS_CLIENT";

@Injectable()
export class GameRabbitMQPublisher {
  constructor(@Inject(WALLET_EVENTS_CLIENT) private readonly client: ClientProxy) {}

  publish(eventType: string, payload: Record<string, unknown>): void {
    this.client.emit(eventType, payload);
  }
}
