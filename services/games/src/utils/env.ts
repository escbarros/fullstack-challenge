import { z } from "zod";
import { InvalidEnvironmentVariableError } from "./errors/invalid-environment-variable.error";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  RABBITMQ_URL: z.string().url().startsWith("amqp://"),
  BETTING_DURATION_MS: z.coerce.number().int().min(1).default(10_000),
  TICK_INTERVAL_MS: z.coerce.number().int().min(50).default(100),
  GROWTH_RATE: z.coerce.number().positive().default(0.06),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new InvalidEnvironmentVariableError(result.error.issues);
  }
  return result.data;
}
