export class DebitAmountTooHighError extends Error {
  constructor() {
    super(`Debit amount must not exceed 100 000 cents`);
    this.name = "DebitAmountTooHighError";
  }
}
