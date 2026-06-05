import { BetStatus } from '../bet.entity';

export class BetCannotCashOutError extends Error {
  constructor(public readonly currentStatus: BetStatus) {
    super(`Bet cannot cash out from status: ${currentStatus}`);
    this.name = 'BetCannotCashOutError';
  }
}
