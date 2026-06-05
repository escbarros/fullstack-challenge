import { Round } from "./round.entity";

export abstract class RoundRepository {
  abstract save(round: Round): Promise<void>;
  abstract findCurrent(): Promise<Round | null>;
  abstract findById(id: string): Promise<Round | null>;
  abstract findWithLock(id: string): Promise<Round | null>;
  abstract findHistory(
    limit: number,
    offset: number,
  ): Promise<{ items: Round[]; total: number }>;
}
