import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { defineConfig } from "@mikro-orm/postgresql";
import { validate } from "./utils/env";
import type { Env } from "./utils/env";
import { RoundModule } from "./round/round.module";
import { BetModule } from "./bet/bet.module";
import { OutboxModule } from "./outbox/outbox.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    MikroOrmModule.forRootAsync({
      useFactory: (config: ConfigService<Env, true>) =>
        defineConfig({
          clientUrl: config.get("DATABASE_URL"),
          entities: ["dist/**/domain/*.entity.js"],
          entitiesTs: ["src/**/domain/*.entity.ts"],
          migrations: {
            path: "./src/migrations",
            glob: "!(*.d).{js,ts}",
          },
          debug: config.get("NODE_ENV") !== "production",
        }),
      inject: [ConfigService],
    }),
    RoundModule,
    BetModule,
    OutboxModule,
  ],
})
export class AppModule {}
