import { Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Round } from "./domain/round.entity";
import { RoundRepository } from "./domain/round.repository";
import { MikroOrmRoundRepository } from "./infrastructure/mikroorm-round.repository";

@Module({
  imports: [MikroOrmModule.forFeature([Round])],
  providers: [
    {
      provide: RoundRepository,
      useClass: MikroOrmRoundRepository,
    },
  ],
  exports: [RoundRepository],
})
export class RoundModule {}
