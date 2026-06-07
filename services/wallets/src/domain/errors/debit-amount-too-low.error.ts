export class DebitAmountTooLowError extends Error {
  constructor() {
    super(`Debit amount must be at least 100 cents`);
    this.name = "DebitAmountTooLowError";
  }
}
