import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Round, RoundRepository, RoundStatus } from "../../domain";
import { StartActivePhaseUseCase } from "../use-cases/start-active-phase.use-case";
import { CrashTicker } from "./crash-ticker.service";

@Injectable()
export class RoundScheduler implements OnModuleInit {
  private readonly logger = new Logger(RoundScheduler.name);
  private timeoutHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly startActivePhaseUseCase: StartActivePhaseUseCase,
    @Inject(forwardRef(() => CrashTicker))
    private readonly crashTicker: CrashTicker,
  ) {}

  async onModuleInit(): Promise<void> {
    const round = await this.roundRepository.findCurrent();
    if (!round) return;

    if (round.status === RoundStatus.BETTING) {
      this.schedule(round);
    } else if (round.status === RoundStatus.ACTIVE) {
      this.crashTicker.start(round);
    }
  }

  schedule(round: Round): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
    }

    const delay = Math.max(0, round.bettingEndsAt.getTime() - Date.now());

    this.timeoutHandle = setTimeout(async () => {
      try {
        const activatedRound = await this.startActivePhaseUseCase.execute();
        if (activatedRound) {
          this.crashTicker.start(activatedRound);
        }
      } catch (err) {
        this.logger.error("failed to start active phase", err);
      }
    }, delay);
  }
}
