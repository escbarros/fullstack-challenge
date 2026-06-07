export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient balance to complete the debit");
    this.name = "InsufficientBalanceError";
  }
}
