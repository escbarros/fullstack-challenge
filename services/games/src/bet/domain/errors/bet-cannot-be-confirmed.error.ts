import { BetStatus } from '../bet.entity';

export class BetCannotBeConfirmedError extends Error {
  constructor(public readonly currentStatus: BetStatus) {
    super(`Bet cannot be confirmed from status: ${currentStatus}`);
    this.name = 'BetCannotBeConfirmedError';
  }
}
