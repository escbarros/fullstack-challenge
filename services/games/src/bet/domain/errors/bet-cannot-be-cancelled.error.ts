import { BetStatus } from '../bet.entity';

export class BetCannotBeCancelledError extends Error {
  constructor(public readonly currentStatus: BetStatus) {
    super(`Bet cannot be cancelled from status: ${currentStatus}`);
    this.name = 'BetCannotBeCancelledError';
  }
}
