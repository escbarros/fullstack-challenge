import { RoundStatus } from '../round.entity';

export class RoundCannotCrashError extends Error {
  constructor(public readonly currentStatus: RoundStatus) {
    super(`Round cannot crash from status: ${currentStatus}`);
    this.name = 'RoundCannotCrashError';
  }
}
