import { Bet } from "./bet.entity";

export abstract class BetRepository {
  abstract findActiveByRoundId(roundId: string): Promise<Bet[]>;
}
