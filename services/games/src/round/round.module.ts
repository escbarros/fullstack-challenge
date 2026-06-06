import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Round } from "./domain/round.entity";
import { RoundRepository } from "./domain/round.repository";
import { MikroOrmRoundRepository } from "./infrastructure/mikroorm-round.repository";
import { GameGateway } from "./presentation/game.gateway";
import { StartRoundUseCase } from "./application/start-round.use-case";

@Module({
  imports: [MikroOrmModule.forFeature([Round])],
  providers: [
    GameGateway,
    StartRoundUseCase,
    {
      provide: RoundRepository,
      useClass: MikroOrmRoundRepository,
    },
  ],
  exports: [RoundRepository, GameGateway, StartRoundUseCase],
})
export class RoundModule {}