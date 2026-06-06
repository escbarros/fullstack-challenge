import { forwardRef, Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Round } from "./domain/round.entity";
import { RoundRepository } from "./domain/round.repository";
import { MikroOrmRoundRepository } from "./infrastructure/mikroorm-round.repository";
import { GameGateway } from "./presentation/game.gateway";
import { StartRoundUseCase } from "./application/start-round.use-case";
import { StartActivePhaseUseCase } from "./application/start-active-phase.use-case";
import { CrashRoundUseCase } from "./application/crash-round.use-case";
import { RoundScheduler } from "./application/round-scheduler.service";
import { CrashTicker } from "./application/crash-ticker.service";
import { BetModule } from "../bet/bet.module";

@Module({
  imports: [MikroOrmModule.forFeature([Round]), BetModule],
  providers: [
    GameGateway,
    StartRoundUseCase,
    StartActivePhaseUseCase,
    CrashRoundUseCase,
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