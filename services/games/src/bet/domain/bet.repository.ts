import { Bet } from "./bet.entity";
import { Outbox } from "../../outbox/domain/outbox.entity";

export abstract class BetRepository {
  abstract findActiveByRoundId(roundId: string): Promise<Bet[]>;
  abstract findById(id: string): Promise<Bet | null>;
  abstract findByPlayerAndRound(playerId: string, roundId: string): Promise<Bet[]>;
  abstract save(bet: Bet): Promise<void>;
  abstract saveBetWithOutbox(bet: Bet, outbox: Outbox): Promise<void>;
}
