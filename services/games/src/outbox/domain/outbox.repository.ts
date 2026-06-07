import { Outbox } from "./outbox.entity";

export abstract class OutboxRepository {
  abstract findPending(limit: number): Promise<Outbox[]>;
  abstract save(outbox: Outbox): Promise<void>;
}
