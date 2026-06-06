import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Bet } from "./domain/bet.entity";
import { BetRepository } from "./domain/bet.repository";
import { MikroOrmBetRepository } from "./infrastructure/mikroorm-bet.repository";

@Module({
  imports: [MikroOrmModule.forFeature([Bet])],
  providers: [
    {
      provide: BetRepository,
      useClass: MikroOrmBetRepository,
    },
  ],
  exports: [BetRepository],
})
export class BetModule {}
