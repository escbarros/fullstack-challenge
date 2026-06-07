export class InvalidCreditAmountError extends Error {
  constructor() {
    super("Credit amount must be greater than zero");
    this.name = "InvalidCreditAmountError";
  }
}
