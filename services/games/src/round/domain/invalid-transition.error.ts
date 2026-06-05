export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}
