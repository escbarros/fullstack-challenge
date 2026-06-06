import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Round, RoundStateMachine, calculateMultiplier } from "../domain";
import { GameGateway } from "../presentation/game.gateway";
import { CrashRoundUseCase } from "./crash-round.use-case";
import { RoundScheduler } from "./round-scheduler.service";
import { Env } from "../../utils/env";

@Injectable()
export class CrashTicker {
  private readonly logger = new Logger(CrashTicker.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private round: Round | null = null;
  private lastTickEmittedAt = 0;

  constructor(
    private readonly crashRoundUseCase: CrashRoundUseCase,
    @Inject(forwardRef(() => RoundScheduler))
    private readonly roundScheduler: RoundScheduler,
    private readonly gameGateway: GameGateway,
    private readonly config: ConfigService<Env, true>,
  ) {}

  start(round: Round): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }

    this.round = round;
    this.lastTickEmittedAt = Date.now();

    const tickIntervalMs = this.config.get("TICK_INTERVAL_MS", { infer: true });

    this.intervalHandle = setInterval(async () => {
      await this.tick();
    }, tickIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.round = null;
  }

  private async tick(): Promise<void> {
    if (!this.round || !this.round.startedAt) return;

    const growthRate = this.config.get("GROWTH_RATE", { infer: true });
    const multiplier = calculateMultiplier(this.round.startedAt, growthRate);

    if (RoundStateMachine.isCrashReached(this.round, multiplier)) {
      const roundId = this.round.id;
      this.stop();
      try {
        const nextRound = await this.crashRoundUseCase.execute(roundId);
        if (nextRound) {
          this.roundScheduler.schedule(nextRound);
        }
      } catch (err) {
        this.logger.error("failed to crash round", err);
      }
      return;
    }

    const now = Date.now();
    if (now - this.lastTickEmittedAt >= 1_000) {
      this.gameGateway.emitRoundTick({
        roundId: this.round.id,
        elapsedMs: now - this.round.startedAt.getTime(),
      });
      this.lastTickEmittedAt = now;
    }
  }
}
