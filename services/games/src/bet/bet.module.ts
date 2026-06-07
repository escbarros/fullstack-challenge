import { forwardRef, Module } from "@nestjs/common";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Bet } from "./domain/bet.entity";
import { BetRepository } from "./domain/bet.repository";
import { MikroOrmBetRepository } from "./infrastructure/mikroorm-bet.repository";
import { WalletEventConsumer } from "./infrastructure/wallet-event.consumer";
import { PlaceBetUseCase } from "./application/place-bet.use-case";
import { CashoutUseCase } from "./application/cashout.use-case";
import { BetController } from "./presentation/bet.controller";
import { RoundModule } from "../round/round.module";
import { OutboxModule } from "../outbox/outbox.module";

@Module({
  imports: [
    MikroOrmModule.forFeature([Bet]),
    forwardRef(() => RoundModule),
    OutboxModule,
  ],
  controllers: [BetController, WalletEventConsumer],
  providers: [
    PlaceBetUseCase,
    CashoutUseCase,
    {
      provide: BetRepository,
      useClass: MikroOrmBetRepository,
    },
  ],
  exports: [BetRepository],
})
export class BetModule {}
