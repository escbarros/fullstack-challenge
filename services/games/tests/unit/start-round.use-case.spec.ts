import "reflect-metadata";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StartRoundUseCase } from "@/round/application/use-cases/start-round.use-case";
import { RoundRepository } from "@/round/domain/round.repository";
import { RoundStatus } from "@/round/domain/round.entity";
import { GameGateway } from "@/round/presentation/game.gateway";
import { ConfigService } from "@nestjs/config";
import { Env } from "@/utils/env";

function makeRepository(): RoundRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findCurrent: vi.fn(),
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

function makeConfig(bettingDurationMs = 10_000): ConfigService<Env, true> {
  return {
    get: vi.fn().mockReturnValue(bettingDurationMs),
  } as unknown as ConfigService<Env, true>;
}

describe("StartRoundUseCase", () => {
  let repository: RoundRepository;
  let gateway: GameGateway;
  let useCase: StartRoundUseCase;

  beforeEach(() => {
    repository = makeRepository();
    gateway = makeGateway();
    useCase = new StartRoundUseCase(repository, gateway, makeConfig());
  });

  it("[UT-GS-091] execute() returns a Round instance with a uuid id", async () => {
    const round = await useCase.execute();
    expect(round).toBeTruthy();
    expect(round.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("[UT-GS-092] returned round has status BETTING", async () => {
    const round = await useCase.execute();

    expect(round.status).toBe(RoundStatus.BETTING);
  });

  it("[UT-GS-093] returned round carries all provably fair fields", async () => {
    const round = await useCase.execute();

    expect(round.seedHash).toBeTypeOf("string");
    expect(round.seedHash.length).toBeGreaterThan(0);
    expect(round.serverSeed).toBeTypeOf("string");
    expect(round.serverSeed.length).toBeGreaterThan(0);
    expect(round.clientSeed).toBeTypeOf("string");
    expect(round.clientSeed.length).toBeGreaterThan(0);
    expect(parseFloat(round.crashPoint)).toBeGreaterThanOrEqual(1);
  });

  it("[UT-GS-094] bettingEndsAt is approximately now + 10_000 ms by default", async () => {
    const before = Date.now();
    const round = await useCase.execute();
    const after = Date.now();

    const bettingEndsAtMs = round.bettingEndsAt.getTime();
    expect(bettingEndsAtMs).toBeGreaterThanOrEqual(before + 10_000 - 500);
    expect(bettingEndsAtMs).toBeLessThanOrEqual(after + 10_000 + 500);
  });

  it("[UT-GS-095] save() is called exactly once with the returned round", async () => {
    const round = await useCase.execute();

    expect(repository.save).toHaveBeenCalledOnce();
    expect(repository.save).toHaveBeenCalledWith(round);
  });

  it("[UT-GS-096] emitRoundBetting() is called with roundId, seedHash, and bettingEndsAt — no serverSeed", async () => {
    const round = await useCase.execute();

    expect(gateway.emitRoundBetting).toHaveBeenCalledOnce();
    expect(gateway.emitRoundBetting).toHaveBeenCalledWith({
      roundId: round.id,
      seedHash: round.seedHash,
      bettingEndsAt: round.bettingEndsAt,
    });

    const payload = vi.mocked(gateway.emitRoundBetting).mock.calls[0][0];
    expect(payload).not.toHaveProperty("serverSeed");
  });

  it("[UT-GS-097] save() is called before emitRoundBetting()", async () => {
    const callOrder: string[] = [];
    vi.mocked(repository.save).mockImplementation(async () => {
      callOrder.push("save");
    });
    vi.mocked(gateway.emitRoundBetting).mockImplementation(() => {
      callOrder.push("emit");
    });

    await useCase.execute();

    expect(callOrder).toEqual(["save", "emit"]);
  });

  it("[UT-GS-098] BETTING_DURATION_MS config value overrides the default duration", async () => {
    const customUseCase = new StartRoundUseCase(
      repository,
      gateway,
      makeConfig(5_000),
    );

    const before = Date.now();
    const round = await customUseCase.execute();
    const after = Date.now();

    const bettingEndsAtMs = round.bettingEndsAt.getTime();
    expect(bettingEndsAtMs).toBeGreaterThanOrEqual(before + 5_000 - 500);
    expect(bettingEndsAtMs).toBeLessThanOrEqual(after + 5_000 + 500);
  });
});
