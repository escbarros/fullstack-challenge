import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Round } from "./domain/round.entity";
import { RoundRepository } from "./domain/round.repository";
import { MikroOrmRoundRepository } from "./infrastructure/mikroorm-round.repository";
import { GameGateway } from "./presentation/game.gateway";
import {
  StartRoundUseCase,
  StartActivePhaseUseCase,
  CrashRoundUseCase,
  RoundScheduler,
  CrashTicker,
  RoundLifecycleBus,
} from "./application";
import { BetModule } from "../bet/bet.module";

@Module({
  imports: [MikroOrmModule.forFeature([Round]), BetModule],
  providers: [
    GameGateway,
    StartRoundUseCase,
    StartActivePhaseUseCase,
    CrashRoundUseCase,
    RoundLifecycleBus,
    RoundScheduler,
    CrashTicker,
    {
      provide: RoundRepository,
      useClass: MikroOrmRoundRepository,
    },
  ],
  exports: [RoundRepository, GameGateway, StartRoundUseCase, StartActivePhaseUseCase, CrashRoundUseCase, RoundScheduler],
})
export class RoundModule {}