import "reflect-metadata";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StartActivePhaseUseCase } from "@/round/application/start-active-phase.use-case";
import { RoundRepository } from "@/round/domain/round.repository";
import { Round, RoundStatus } from "@/round/domain/round.entity";
import { RoundAlreadyStartedError } from "@/round/domain/errors/round-already-started.error";
import { RoundCrashedError } from "@/round/domain/errors/round-crashed.error";
import { GameGateway } from "@/round/presentation/game.gateway";

function makeRound(status = RoundStatus.BETTING): Round {
  const round = Round.create({
    crashPoint: "2.50",
    seedHash: "abc",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date(Date.now() + 10_000),
  });
  return Object.assign(round, { status });
}

function makeRepository(round: Round | null = null): RoundRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findCurrent: vi.fn().mockResolvedValue(round),
    findById: vi.fn(),
    findWithLock: vi.fn(),
    findHistory: vi.fn(),
  } as unknown as RoundRepository;
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

describe("StartActivePhaseUseCase", () => {
  let gateway: GameGateway;

  beforeEach(() => {
    gateway = makeGateway();
  });

  it("[UT-GS-099] returns early without side-effects when no current round exists", async () => {
    const repository = makeRepository(null);
    const useCase = new StartActivePhaseUseCase(repository, gateway);

    await useCase.execute();

    expect(repository.save).not.toHaveBeenCalled();
    expect(gateway.emitRoundStarted).not.toHaveBeenCalled();
  });

  it("[UT-GS-100] transitions the round to ACTIVE and persists it", async () => {
    const round = makeRound(RoundStatus.BETTING);
    const repository = makeRepository(round);
    const useCase = new StartActivePhaseUseCase(repository, gateway);

    await useCase.execute();


    expect(round.status).toBe(RoundStatus.ACTIVE);
    expect(repository.save).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith(round);
  });

  it("[UT-GS-101] save() is called before emitRoundStarted()", async () => {
    const round = makeRound(RoundStatus.BETTING);
    const repository = makeRepository(round);
    const useCase = new StartActivePhaseUseCase(repository, gateway);

    const callOrder: string[] = [];
    vi.mocked(repository.save).mockImplementation(async () => {
      callOrder.push("save");
    });
    vi.mocked(gateway.emitRoundStarted).mockImplementation(() => {
      callOrder.push("emit");
    });

    await useCase.execute();

    expect(callOrder).toEqual(["save", "emit"]);
  });

  it("[UT-GS-102] emitRoundStarted() is called with roundId and startedAt", async () => {
    const round = makeRound(RoundStatus.BETTING);
    const repository = makeRepository(round);
    const useCase = new StartActivePhaseUseCase(repository, gateway);

    await useCase.execute();

    expect(gateway.emitRoundStarted).toHaveBeenCalledOnce();
    expect(gateway.emitRoundStarted).toHaveBeenCalledWith({
      roundId: round.id,
      startedAt: round.startedAt,
    });
    expect(round.startedAt).toBeInstanceOf(Date);
  });

  it("[UT-GS-103] throws RoundAlreadyStartedError when round is already ACTIVE", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const repository = makeRepository(round);
    const useCase = new StartActivePhaseUseCase(repository, gateway);

    await expect(useCase.execute()).rejects.toThrow(RoundAlreadyStartedError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(gateway.emitRoundStarted).not.toHaveBeenCalled();
  });

  it("[UT-GS-104] throws RoundCrashedError when round is CRASHED", async () => {
    const round = makeRound(RoundStatus.CRASHED);
    const repository = makeRepository(round);
    const useCase = new StartActivePhaseUseCase(repository, gateway);

    await expect(useCase.execute()).rejects.toThrow(RoundCrashedError);
    expect(repository.save).not.toHaveBeenCalled();
    expect(gateway.emitRoundStarted).not.toHaveBeenCalled();
  });
});
