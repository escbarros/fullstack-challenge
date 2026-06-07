export class InvalidEnvironmentVariableError extends Error {
  constructor(issues: { path: (string | number)[]; message: string }[]) {
    const formatted = issues.map((i) => `  ${i.path.join(".")}`).join("\n");
    super(`Invalid environment variables:\n${formatted}`);
    this.name = "InvalidEnvironmentVariableError";
  }
}
