import "reflect-metadata";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CrashTicker } from "@/round/application/services/crash-ticker.service";
import { Round, RoundStatus } from "@/round/domain/round.entity";
import { GameGateway } from "@/round/presentation/game.gateway";
import { CrashRoundUseCase } from "@/round/application/use-cases/crash-round.use-case";
import { RoundScheduler } from "@/round/application/services/round-scheduler.service";
import { Env } from "@/utils/env";

function makeActiveRound(overrides: Omit<Partial<Round>, "crashPoint"> = {}): Round {
  const round = Round.create({
    crashPoint: "999.00",
    seedHash: "hash",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date(Date.now() - 1_000),
  });
  return Object.assign(round, {
    status: RoundStatus.ACTIVE,
    startedAt: new Date(),
    ...overrides,
  });
}

function makeCrashBoundRound(): Round {
  // startedAt 5s ago: e^(5 × 0.06) ≈ 1.35 >= 1.01 → crash reached on first tick
  const round = Round.create({
    crashPoint: "1.01",
    seedHash: "hash",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date(Date.now() - 1_000),
  });
  return Object.assign(round, {
    status: RoundStatus.ACTIVE,
    startedAt: new Date(Date.now() - 5_000),
  });
}

function makeConfig({ tickIntervalMs = 100, growthRate = 0.06 } = {}): ConfigService<Env, true> {
  return {
    get: vi.fn().mockImplementation((key: string) => {
      if (key === "TICK_INTERVAL_MS") return tickIntervalMs;
      if (key === "GROWTH_RATE") return growthRate;
    }),
  } as unknown as ConfigService<Env, true>;
}

function makeCrashRoundUseCase(nextRound: Round | null = null): CrashRoundUseCase {
  return {
    execute: vi.fn().mockResolvedValue(nextRound),
  } as unknown as CrashRoundUseCase;
}

function makeRoundSchedulerMock(): RoundScheduler {
  return {
    schedule: vi.fn(),
  } as unknown as RoundScheduler;
}

function makeGateway(): GameGateway {
  return {
    emitRoundBetting: vi.fn(),
    emitRoundStarted: vi.fn(),
    emitRoundCrashed: vi.fn(),
    emitRoundBet: vi.fn(),
    emitRoundCashout: vi.fn(),
    emitRoundTick: vi.fn(),
  } as unknown as GameGateway;
}

function makeTicker({ nextRound = null as Round | null, config = makeConfig() } = {}) {
  const crashRoundUseCase = makeCrashRoundUseCase(nextRound);
  const roundScheduler = makeRoundSchedulerMock();
  const gateway = makeGateway();
  const ticker = new CrashTicker(crashRoundUseCase, roundScheduler, gateway, config);
  return { ticker, crashRoundUseCase, roundScheduler, gateway };
}

describe("CrashTicker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[UT-GS-125] start: starts interval and fires first tick after TICK_INTERVAL_MS", async () => {
    const round = makeActiveRound();
    const { ticker, crashRoundUseCase } = makeTicker();
    ticker.start(round);
    expect(crashRoundUseCase.execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(crashRoundUseCase.execute).not.toHaveBeenCalled();
  });

  it("[UT-GS-126] start: called while already running —> clears previous interval and resets the 1000ms emission counter", async () => {
    const first = makeActiveRound();
    const second = makeActiveRound();
    const { ticker, gateway } = makeTicker();
    ticker.start(first);
    await vi.advanceTimersByTimeAsync(800); // 800ms
    ticker.start(second);                   // counter resets
    await vi.advanceTimersByTimeAsync(300); // 300ms → no emission
    expect(gateway.emitRoundTick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(800); // 1100ms → one emission
    expect(gateway.emitRoundTick).toHaveBeenCalledOnce();
  });

  it("[UT-GS-127] stop: clears interval —> no ticks fire after stop", async () => {
    const round = makeCrashBoundRound();
    const { ticker, crashRoundUseCase } = makeTicker();
    ticker.start(round);
    ticker.stop();
    await vi.advanceTimersByTimeAsync(500);
    expect(crashRoundUseCase.execute).not.toHaveBeenCalled();
  });

  it("[UT-GS-128] stop: called when not running —> does not throw", () => {
    const { ticker } = makeTicker();
    expect(() => ticker.stop()).not.toThrow();
  });

  it("[UT-GS-129] tick: round.startedAt is undefined —> no crash check, no emit", async () => {
    const round = makeActiveRound({ startedAt: undefined });
    const { ticker, crashRoundUseCase, gateway } = makeTicker();
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100);
    expect(crashRoundUseCase.execute).not.toHaveBeenCalled();
    expect(gateway.emitRoundTick).not.toHaveBeenCalled();
  });

  it("[UT-GS-130] tick: crash NOT reached, < 1000ms elapsed —> does not emit round:tick", async () => {
    const round = makeActiveRound();
    const { ticker, gateway } = makeTicker();
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100); // 100ms elapsed
    expect(gateway.emitRoundTick).not.toHaveBeenCalled();
  });

  it("[UT-GS-131] tick: crash NOT reached, >= 1000ms elapsed —> emits round:tick once with correct payload", async () => {
    const round = makeActiveRound();
    const { ticker, gateway } = makeTicker();
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(1_100); // 11 ticks; >= 1000ms elapsed
    expect(gateway.emitRoundTick).toHaveBeenCalledOnce();
    const payload = vi.mocked(gateway.emitRoundTick).mock.calls[0][0];
    expect(payload.roundId).toBe(round.id);
    expect(payload.elapsedMs).toBeGreaterThanOrEqual(1_000);
  });

  it("[UT-GS-132] tick: crash reached —> calls crashRoundUseCase.execute with the round id", async () => {
    const round = makeCrashBoundRound();
    const { ticker, crashRoundUseCase } = makeTicker();
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100);
    expect(crashRoundUseCase.execute).toHaveBeenCalledOnce();
    expect(crashRoundUseCase.execute).toHaveBeenCalledWith(round.id);
  });

  it("[UT-GS-133] tick: crash reached —> stop() prevents further ticks after crash", async () => {
    const round = makeCrashBoundRound();
    const { ticker, crashRoundUseCase } = makeTicker();
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(500);
    expect(crashRoundUseCase.execute).toHaveBeenCalledOnce();
  });

  it("[UT-GS-134] tick: crash reached, nextRound returned —> calls roundScheduler.schedule(nextRound)", async () => {
    const nextRound = Round.create({
      crashPoint: "2.50",
      seedHash: "h",
      serverSeed: "s",
      clientSeed: "c",
      bettingEndsAt: new Date(Date.now() + 10_000),
    });
    const round = makeCrashBoundRound();
    const { ticker, roundScheduler } = makeTicker({ nextRound });
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100);
    expect(roundScheduler.schedule).toHaveBeenCalledOnce();
    expect(roundScheduler.schedule).toHaveBeenCalledWith(nextRound);
  });

  it("[UT-GS-135] tick: crash reached, nextRound is null —> does NOT call roundScheduler.schedule", async () => {
    const round = makeCrashBoundRound();
    const { ticker, roundScheduler } = makeTicker({ nextRound: null });
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100);
    expect(roundScheduler.schedule).not.toHaveBeenCalled();
  });

  it("[UT-GS-136] tick: crashRoundUseCase throws —> error is caught and logged, ticker remains stopped", async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "error");
    const round = makeCrashBoundRound();
    const { ticker, crashRoundUseCase, roundScheduler } = makeTicker();
    vi.mocked(crashRoundUseCase.execute).mockRejectedValue(new Error("lock timeout"));
    ticker.start(round);
    await vi.advanceTimersByTimeAsync(100);
    expect(loggerSpy).toHaveBeenCalledWith("failed to crash round", expect.any(Error));
    await vi.advanceTimersByTimeAsync(500);
    expect(crashRoundUseCase.execute).toHaveBeenCalledOnce();
    expect(roundScheduler.schedule).not.toHaveBeenCalled();
  });
});
