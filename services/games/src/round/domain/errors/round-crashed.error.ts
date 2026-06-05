import { RoundStatus } from '../round.entity';

export class RoundCrashedError extends Error {
  constructor(public readonly currentStatus: RoundStatus) {
    super(`Round cannot be started from status: ${currentStatus}`);
    this.name = 'RoundCrashedError';
  }
}
