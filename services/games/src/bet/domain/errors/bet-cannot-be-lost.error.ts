import { BetStatus } from '../bet.entity';

export class BetCannotBeLostError extends Error {
  constructor(public readonly currentStatus: BetStatus) {
    super(`Bet cannot be marked as lost from status: ${currentStatus}`);
    this.name = 'BetCannotBeLostError';
  }
}
