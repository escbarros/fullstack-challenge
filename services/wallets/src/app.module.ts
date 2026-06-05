import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validate } from "./config/env";
import { WalletsController } from "./presentation/controllers/wallets.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
  controllers: [WalletsController],
})
export class AppModule {}
