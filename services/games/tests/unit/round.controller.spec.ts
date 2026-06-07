import { describe, it, expect, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { RoundController } from "../../src/round/presentation/round.controller";
import { GetCurrentRoundUseCase } from "../../src/round/application/use-cases/get-current-round.use-case";
import { GetRoundHistoryUseCase } from "../../src/round/application/use-cases/get-round-history.use-case";
import { VerifyRoundUseCase } from "../../src/round/application/use-cases/verify-round.use-case";
import { Round, RoundStatus } from "../../src/round/domain/round.entity";

function makeRound(overrides: Partial<Round> = {}): Round {
  const round = Round.create({
    crashPoint: "2.50",
    seedHash: "abc123",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date("2026-06-06T12:00:10.000Z"),
  });
  return Object.assign(round, overrides);
}

async function makeController(executeResult: Round | null) {
  const currentUseCase = { execute: vi.fn().mockResolvedValue(executeResult) };
  const historyUseCase = { execute: vi.fn() };
  const verifyUseCase = { execute: vi.fn() };
  const module = await Test.createTestingModule({
    controllers: [RoundController],
    providers: [
      { provide: GetCurrentRoundUseCase, useValue: currentUseCase },
      { provide: GetRoundHistoryUseCase, useValue: historyUseCase },
      { provide: VerifyRoundUseCase, useValue: verifyUseCase },
    ],
  }).compile();
  return {
    controller: module.get(RoundController),
    useCase: currentUseCase,
  };
}

async function makeHistoryController(result: {
  items: Round[];
  total: number;
  page: number;
  limit: number;
}) {
  const historyUseCase = { execute: vi.fn().mockResolvedValue(result) };
  const module = await Test.createTestingModule({
    controllers: [RoundController],
    providers: [
      { provide: GetCurrentRoundUseCase, useValue: { execute: vi.fn() } },
      { provide: GetRoundHistoryUseCase, useValue: historyUseCase },
      { provide: VerifyRoundUseCase, useValue: { execute: vi.fn() } },
    ],
  }).compile();
  return { controller: module.get(RoundController), historyUseCase };
}

async function makeVerifyController(result: any | Error) {
  const verifyUseCase = {
    execute: result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result),
  };
  const module = await Test.createTestingModule({
    controllers: [RoundController],
    providers: [
      { provide: GetCurrentRoundUseCase, useValue: { execute: vi.fn() } },
      { provide: GetRoundHistoryUseCase, useValue: { execute: vi.fn() } },
      { provide: VerifyRoundUseCase, useValue: verifyUseCase },
    ],
  }).compile();
  return { controller: module.get(RoundController), verifyUseCase };
}

describe("RoundController", () => {
  // UT-GS-137
  it("returns { data: null, meta: null, error: null } when no round exists", async () => {
    const { controller } = await makeController(null);
    const result = await controller.getCurrent();
    expect(result).toEqual({ data: null, meta: null, error: null });
  });

  // UT-GS-138
  it("maps a BETTING round to RoundResponseDto without sensitive fields", async () => {
    const round = makeRound({
      status: RoundStatus.BETTING,
      bettingEndsAt: new Date("2026-06-06T12:00:10.000Z"),
      startedAt: undefined,
      crashedAt: undefined,
    });
    const { controller } = await makeController(round);
    const result = await controller.getCurrent();

    expect(result.error).toBeNull();
    expect(result.meta).toBeNull();

    const data = result.data!;
    expect(data.id).toBe(round.id);
    expect(data.status).toBe("betting");
    expect(data.seedHash).toBe("abc123");
    expect(data.bettingEndsAt).toBe("2026-06-06T12:00:10.000Z");
    expect(data.startedAt).toBeNull();
    expect(data.crashedAt).toBeNull();
    expect(data.bets).toEqual([]);

    expect(data).not.toHaveProperty("serverSeed");
    expect(data).not.toHaveProperty("clientSeed");
    expect(data).not.toHaveProperty("crashPoint");
  });

  // UT-GS-139
  it("maps an ACTIVE round with startedAt as ISO string", async () => {
    const round = makeRound({
      bettingEndsAt: new Date("2026-06-06T12:00:10.000Z"),
    });
    round.start();

    const { controller } = await makeController(round);
    const result = await controller.getCurrent();

    const data = result.data!;
    expect(data.status).toBe("active");
    expect(typeof data.startedAt).toBe("string");
    expect(() => new Date(data.startedAt!)).not.toThrow();
    expect(data.crashedAt).toBeNull();
    expect(data.bets).toEqual([]);
  });

  it("[UT-GS-159] getHistory maps items to RoundHistoryItemDto array", async () => {
    const r1 = makeRound({
      status: RoundStatus.CRASHED,
      startedAt: new Date("2026-06-06T12:00:00.000Z"),
      crashedAt: new Date("2026-06-06T12:00:10.000Z"),
    });
    const r2 = makeRound({
      status: RoundStatus.CRASHED,
      startedAt: new Date("2026-06-06T12:01:00.000Z"),
      crashedAt: new Date("2026-06-06T12:01:10.000Z"),
    });

    const { controller } = await makeHistoryController({ items: [r1, r2], total: 2, page: 1, limit: 20 });
    const result = await controller.getHistory("1", "20");

    expect(result.data).toEqual([
      {
        id: r1.id,
        crashPoint: r1.crashPoint,
        seedHash: r1.seedHash,
        startedAt: r1.startedAt!.toISOString(),
        crashedAt: r1.crashedAt!.toISOString(),
      },
      {
        id: r2.id,
        crashPoint: r2.crashPoint,
        seedHash: r2.seedHash,
        startedAt: r2.startedAt!.toISOString(),
        crashedAt: r2.crashedAt!.toISOString(),
      },
    ]);
  });

  it("[UT-GS-160] getHistory returns meta with pagination object", async () => {
    const { controller } = await makeHistoryController({ items: [], total: 33, page: 2, limit: 10 });
    const result = await controller.getHistory("2", "10");

    expect(result.meta).toEqual({ pagination: { page: 2, limit: 10, total: 33 } });
  });

  it("[UT-GS-161] getHistory error is null", async () => {
    const { controller } = await makeHistoryController({ items: [], total: 0, page: 1, limit: 20 });
    const result = await controller.getHistory("1", "20");

    expect(result.error).toBeNull();
  });

  it("[UT-GS-162] getHistory data items do NOT include serverSeed or clientSeed", async () => {
    const round = makeRound({
      status: RoundStatus.CRASHED,
      startedAt: new Date("2026-06-06T12:00:00.000Z"),
      crashedAt: new Date("2026-06-06T12:00:10.000Z"),
    });
    const { controller } = await makeHistoryController({ items: [round], total: 1, page: 1, limit: 20 });
    const result = await controller.getHistory("1", "20");

    expect(result.data[0]).not.toHaveProperty("serverSeed");
    expect(result.data[0]).not.toHaveProperty("clientSeed");
  });

  it("[UT-GS-163] getHistory passes parsed page and limit to use case", async () => {
    const { controller, historyUseCase } = await makeHistoryController({ items: [], total: 0, page: 2, limit: 50 });
    await controller.getHistory("2", "50");

    expect(historyUseCase.execute).toHaveBeenCalledWith(2, 50);
  });

  it("[UT-GS-164] verify returns { data: result, meta: null, error: null }", async () => {
    const verifyResult = {
      roundId: crypto.randomUUID(),
      crashPoint: "2.25",
      seedHash: "hash",
      serverSeed: "server",
      clientSeed: "client",
      verification: {
        step1_sha256_of_serverSeed: "sha",
        step1_matchesSeedHash: true,
        step2_hmac: "hmac",
        step2_hex8: "deadbeef",
        step2_int: 3735928559,
        step3_crashPoint: "2.25",
        step3_matchesClaimed: true,
      },
    };
    const { controller } = await makeVerifyController(verifyResult);

    const result = await controller.verify(verifyResult.roundId);
    expect(result).toEqual({ data: verifyResult, meta: null, error: null });
  });

  it("[UT-GS-165] verify propagates NotFoundException from use case", async () => {
    const { controller } = await makeVerifyController(new NotFoundException("missing"));

    await expect(controller.verify(crypto.randomUUID())).rejects.toThrow(NotFoundException);
  });

  it("[UT-GS-166] verify passes roundId from route param to use case", async () => {
    const verifyResult = {
      roundId: crypto.randomUUID(),
      crashPoint: "2.25",
      seedHash: "hash",
      serverSeed: "server",
      clientSeed: "client",
      verification: {
        step1_sha256_of_serverSeed: "sha",
        step1_matchesSeedHash: true,
        step2_hmac: "hmac",
        step2_hex8: "deadbeef",
        step2_int: 3735928559,
        step3_crashPoint: "2.25",
        step3_matchesClaimed: true,
      },
    };
    const { controller, verifyUseCase } = await makeVerifyController(verifyResult);

    await controller.verify("11111111-1111-4111-8111-111111111111");

    expect(verifyUseCase.execute).toHaveBeenCalledOnce();
    expect(verifyUseCase.execute).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
  });
});
