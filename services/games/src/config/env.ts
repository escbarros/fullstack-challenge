import { z } from "zod";
import { InvalidEnvironmentVariableError } from "../domain/errors/invalid-environment-variable.error";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  RABBITMQ_URL: z.string().url().startsWith("amqp://"),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new InvalidEnvironmentVariableError(result.error.issues);
  }
  return result.data;
}
