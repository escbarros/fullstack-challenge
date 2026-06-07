import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Transport, type MicroserviceOptions } from "@nestjs/microservices";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./utils/http-exception.filter";
import type { Env } from "./utils/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [config.get("RABBITMQ_URL") as string],
      queue: "wallet_queue",
      queueOptions: { durable: true },
      noAck: false,
    },
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.startAllMicroservices();

  const port = config.get("PORT");
  await app.listen(port, "0.0.0.0");
  console.log(`Wallets service running on port ${port}`);
}

bootstrap();
