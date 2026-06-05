export class AmountTooLowError extends Error {
  constructor() {
    super('Bet amount must be at least 100 cents');
    this.name = 'AmountTooLowError';
  }
}
