export class OutboxAlreadyFailedError extends Error {
  constructor() {
    super('Outbox message has already failed definitively');
    this.name = 'OutboxAlreadyFailedError';
  }
}
