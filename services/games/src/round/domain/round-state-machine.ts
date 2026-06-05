import { Round, RoundStatus } from "./round.entity";

export class RoundStateMachine {
  static canPlaceBet(round: Round): boolean {
    return round.status === RoundStatus.BETTING;
  }

  static isCrashReached(round: Round, multiplier: number): boolean {
    return multiplier >= parseFloat(round.crashPoint);
  }
}
