import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateRequestContext } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { Round, RoundStateMachine, calculateMultiplier } from "../../domain";
import { GameGateway } from "../../presentation/game.gateway";
import { CrashRoundUseCase } from "../use-cases/crash-round.use-case";
import { RoundLifecycleBus } from "./round-lifecycle.bus";
import { Env } from "../../../utils/env";

@Injectable()
export class CrashTicker {
  private readonly logger = new Logger(CrashTicker.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private round: Round | null = null;
  private lastTickEmittedAt = 0;

  constructor(
    // Required by @CreateRequestContext to fork a context for timer-driven work.
    private readonly em: EntityManager,
    private readonly crashRoundUseCase: CrashRoundUseCase,
    private readonly lifecycleBus: RoundLifecycleBus,
    private readonly gameGateway: GameGateway,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.lifecycleBus.onActivePhaseStarted((round) => this.start(round));
  }

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
      await this.crashRound(roundId);
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

  // Runs from the tick interval (outside any request), so it needs its own
  // ORM context — the crash use case reads/writes the round and its bets.
  @CreateRequestContext()
  private async crashRound(roundId: string): Promise<void> {
    try {
      // Explicit transaction so that findWithLock's SELECT FOR UPDATE
      // acquires the lock before the crash/cashout race is decided.
      const nextRound = await this.em.transactional(() =>
        this.crashRoundUseCase.execute(roundId),
      );
      if (nextRound) {
        this.lifecycleBus.emitBettingRoundCreated(nextRound);
      }
    } catch (err) {
      this.logger.error("failed to crash round", err);
    }
  }
}
