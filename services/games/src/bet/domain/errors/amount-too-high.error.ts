export class AmountTooHighError extends Error {
  constructor() {
    super('Bet amount must be at most 100000 cents');
    this.name = 'AmountTooHighError';
  }
}
