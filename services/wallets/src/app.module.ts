import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { defineConfig } from "@mikro-orm/postgresql";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { validate, type Env } from "./utils/env";
import { Wallet } from "./domain/wallet.entity";
import { WalletTransaction } from "./domain/wallet-transaction.entity";
import { WalletRepository } from "./domain/wallet.repository";
import { MikroOrmWalletRepository } from "./infrastructure/mikroorm-wallet.repository";
import { WalletRabbitMQPublisher, WALLET_EVENTS_CLIENT } from "./infrastructure/wallet-rabbitmq.publisher";
import { WalletConsumer } from "./infrastructure/wallet.consumer";
import { DebitWalletUseCase } from "./application/debit-wallet.use-case";
import { CreditWalletUseCase } from "./application/credit-wallet.use-case";
import { CreateWalletUseCase } from "./application/create-wallet.use-case";
import { GetWalletUseCase } from "./application/get-wallet.use-case";
import { WalletsController } from "./presentation/wallets.controller";

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
    ClientsModule.registerAsync([
      {
        name: WALLET_EVENTS_CLIENT,
        useFactory: (config: ConfigService<Env, true>) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get("RABBITMQ_URL") as string],
            queue: "game_queue",
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [WalletsController, WalletConsumer],
  providers: [
    DebitWalletUseCase,
    CreditWalletUseCase,
    CreateWalletUseCase,
    GetWalletUseCase,
    WalletRabbitMQPublisher,
    { provide: WalletRepository, useClass: MikroOrmWalletRepository },
  ],
})
export class AppModule {}
