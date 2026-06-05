import { RoundStatus } from '../round.entity';

export class RoundAlreadyCrashedError extends Error {
  constructor(public readonly currentStatus: RoundStatus) {
    super(`Round cannot crash from status: ${currentStatus}`);
    this.name = 'RoundAlreadyCrashedError';
  }
}
