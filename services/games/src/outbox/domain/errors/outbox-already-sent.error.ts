export class OutboxAlreadySentError extends Error {
  constructor() {
    super('Outbox message has already been sent');
    this.name = 'OutboxAlreadySentError';
  }
}
