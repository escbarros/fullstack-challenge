import { BetInRoundDto } from "./bet-in-round.dto";

export class RoundResponseDto {
  id: string;
  status: string;
  seedHash: string;
  bettingEndsAt: string;
  startedAt: string | null;
  crashedAt: string | null;
  bets: BetInRoundDto[];
}
