import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import type { Env } from "./utils/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("games");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Game Service API")
    .setDescription("Round lifecycle and betting endpoints")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("/games/docs", app, document);

  const config = app.get(ConfigService<Env, true>);
  const port = config.get("PORT");
  await app.listen(port, "0.0.0.0");
  console.log(`Games service running on port ${port}`);
}

bootstrap();
