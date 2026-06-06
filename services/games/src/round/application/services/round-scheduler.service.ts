import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateRequestContext } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { Round, RoundRepository, RoundStatus } from "../../domain";
import { StartRoundUseCase } from "../use-cases/start-round.use-case";
import { StartActivePhaseUseCase } from "../use-cases/start-active-phase.use-case";
import { RoundLifecycleBus } from "./round-lifecycle.bus";

@Injectable()
export class RoundScheduler implements OnModuleInit {
  private readonly logger = new Logger(RoundScheduler.name);
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(
    // Required by @CreateRequestContext to fork a context for timer/lifecycle work.
    private readonly em: EntityManager,
    private readonly roundRepository: RoundRepository,
    private readonly startRoundUseCase: StartRoundUseCase,
    private readonly startActivePhaseUseCase: StartActivePhaseUseCase,
    private readonly lifecycleBus: RoundLifecycleBus,
  ) {
    this.lifecycleBus.onBettingRoundCreated((round) => this.schedule(round));
  }

  @CreateRequestContext()
  async onModuleInit(): Promise<void> {
    const round = await this.roundRepository.findCurrent();
    if (!round) {
      const newRound = await this.startRoundUseCase.execute();
      this.schedule(newRound);
      return;
    }

    if (round.status === RoundStatus.BETTING) {
      this.schedule(round);
    } else if (round.status === RoundStatus.ACTIVE) {
      this.lifecycleBus.emitActivePhaseStarted(round);
    }
  }

  schedule(round: Round): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    const delay = Math.max(0, round.bettingEndsAt.getTime() - Date.now());

    this.timeoutHandle = setTimeout(() => {
      void this.transitionToActivePhase();
    }, delay);
  }

  // Runs from a timer (outside any request), so it needs its own ORM context.
  @CreateRequestContext()
  private async transitionToActivePhase(): Promise<void> {
    try {
      const activatedRound = await this.startActivePhaseUseCase.execute();
      if (activatedRound) {
        this.lifecycleBus.emitActivePhaseStarted(activatedRound);
      }
    } catch (err) {
      this.logger.error("failed to start active phase", err);
    }
  }
}
