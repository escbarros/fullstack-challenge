import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { defineConfig } from "@mikro-orm/postgresql";
import { validate, type Env } from "./utils/env";
import { Wallet } from "./domain/wallet.entity";
import { WalletTransaction } from "./domain/wallet-transaction.entity";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
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
    MikroOrmModule.forFeature([Wallet, WalletTransaction]),
  ],
})
export class AppModule {}
