import "reflect-metadata";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "@nestjs/common";
import { RoundScheduler } from "@/round/application/services/round-scheduler.service";
import { RoundRepository } from "@/round/domain/round.repository";
import { Round, RoundStatus } from "@/round/domain/round.entity";
import { StartRoundUseCase } from "@/round/application/use-cases/start-round.use-case";
import { StartActivePhaseUseCase } from "@/round/application/use-cases/start-active-phase.use-case";
import { CrashTicker } from "@/round/application/services/crash-ticker.service";

function makeRound(overrides: Partial<Round> = {}): Round {
  const round = Round.create({
    crashPoint: "2.50",
    seedHash: "hash",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date(Date.now() + 10_000),
  });
  return Object.assign(round, overrides);
}

function makeRoundRepository(round: Round | null = null): RoundRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findCurrent: vi.fn().mockResolvedValue(round),
    findById: vi.fn(),
    findWithLock: vi.fn(),
    findHistory: vi.fn(),
  } as unknown as RoundRepository;
}

function makeStartActivePhaseUseCase(result: Round | null = null): StartActivePhaseUseCase {
  return {
    execute: vi.fn().mockResolvedValue(result),
  } as unknown as StartActivePhaseUseCase;
}

function makeCrashTickerMock(): CrashTicker {
  return {
    start: vi.fn(),
    stop: vi.fn(),
  } as unknown as CrashTicker;
}

function makeStartRoundUseCase(result: Round | null = null): StartRoundUseCase {
  return {
    execute: vi.fn().mockResolvedValue(result),
  } as unknown as StartRoundUseCase;
}

function makeScheduler({
  round = null as Round | null,
  newRound = null as Round | null,
  activatedRound = null as Round | null,
} = {}) {
  const roundRepository = makeRoundRepository(round);
  const startRoundUseCase = makeStartRoundUseCase(newRound);
  const startActivePhaseUseCase = makeStartActivePhaseUseCase(activatedRound);
  const crashTicker = makeCrashTickerMock();
  const scheduler = new RoundScheduler(roundRepository, startRoundUseCase, startActivePhaseUseCase, crashTicker);
  return { scheduler, roundRepository, startRoundUseCase, startActivePhaseUseCase, crashTicker };
}

describe("RoundScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("[UT-GS-116] onModuleInit: no current round —> creates first round and schedules it", async () => {
    const firstRound = makeRound({ bettingEndsAt: new Date(Date.now() + 1_000) });
    const { scheduler, startRoundUseCase, startActivePhaseUseCase } = makeScheduler({ newRound: firstRound });
    await scheduler.onModuleInit();
    expect(startRoundUseCase.execute).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(startActivePhaseUseCase.execute).toHaveBeenCalledOnce();
  });

  it("[UT-GS-117] onModuleInit: BETTING round —> schedules the active phase transition", async () => {
    const round = makeRound({ status: RoundStatus.BETTING, bettingEndsAt: new Date(Date.now() + 1_000) });
    const { scheduler, startActivePhaseUseCase, crashTicker } = makeScheduler({ round, activatedRound: null });
    await scheduler.onModuleInit();
    expect(crashTicker.start).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(startActivePhaseUseCase.execute).toHaveBeenCalledOnce();
  });

  it("[UT-GS-118] onModuleInit: ACTIVE round —> starts the crash ticker immediately", async () => {
    const round = makeRound({ status: RoundStatus.ACTIVE });
    const { scheduler, crashTicker } = makeScheduler({ round });
    await scheduler.onModuleInit();
    expect(crashTicker.start).toHaveBeenCalledOnce();
    expect(crashTicker.start).toHaveBeenCalledWith(round);
  });

  it("[UT-GS-119] onModuleInit: CRASHED round —> does nothing", async () => {
    const round = makeRound({ status: RoundStatus.CRASHED });
    const { scheduler, crashTicker, startActivePhaseUseCase } = makeScheduler({ round });
    await scheduler.onModuleInit();
    expect(crashTicker.start).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(startActivePhaseUseCase.execute).not.toHaveBeenCalled();
  });

  it("[UT-GS-120] schedule: fires callback after bettingEndsAt and calls execute()", async () => {
    const round = makeRound({ bettingEndsAt: new Date(Date.now() + 2_000) });
    const { scheduler, startActivePhaseUseCase } = makeScheduler({ activatedRound: null });
    scheduler.schedule(round);
    expect(startActivePhaseUseCase.execute).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_100);
    expect(startActivePhaseUseCase.execute).toHaveBeenCalledOnce();
  });

  it("[UT-GS-121] schedule: when execute() returns a round, starts crash ticker", async () => {
    const activatedRound = makeRound({ status: RoundStatus.ACTIVE });
    const bettingRound = makeRound({ bettingEndsAt: new Date(Date.now() + 500) });
    const { scheduler, crashTicker } = makeScheduler({ activatedRound });
    scheduler.schedule(bettingRound);
    await vi.advanceTimersByTimeAsync(600);
    expect(crashTicker.start).toHaveBeenCalledOnce();
    expect(crashTicker.start).toHaveBeenCalledWith(activatedRound);
  });

  it("[UT-GS-122] schedule: when execute() returns null, does NOT start crash ticker", async () => {
    const bettingRound = makeRound({ bettingEndsAt: new Date(Date.now() + 500) });
    const { scheduler, crashTicker } = makeScheduler({ activatedRound: null });
    scheduler.schedule(bettingRound);
    await vi.advanceTimersByTimeAsync(600);
    expect(crashTicker.start).not.toHaveBeenCalled();
  });

  it("[UT-GS-123] schedule: execute() throws —> error is caught and logged, does not propagate", async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "error");
    const bettingRound = makeRound({ bettingEndsAt: new Date(Date.now() + 500) });
    const { scheduler, startActivePhaseUseCase } = makeScheduler();
    vi.mocked(startActivePhaseUseCase.execute).mockRejectedValue(new Error("db error"));
    scheduler.schedule(bettingRound);
    await vi.advanceTimersByTimeAsync(600);
    expect(loggerSpy).toHaveBeenCalledWith("failed to start active phase", expect.any(Error));
  });

  it("[UT-GS-124] schedule: called twice —> only the second timeout fires", async () => {
    const first = makeRound({ bettingEndsAt: new Date(Date.now() + 1_000) });
    const second = makeRound({ bettingEndsAt: new Date(Date.now() + 2_000) });
    const { scheduler, startActivePhaseUseCase } = makeScheduler({ activatedRound: null });
    scheduler.schedule(first);
    scheduler.schedule(second);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(startActivePhaseUseCase.execute).toHaveBeenCalledOnce();
  });
});
