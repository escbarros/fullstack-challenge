import { describe, it, expect, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { RoundController } from "../../src/round/presentation/round.controller";
import { GetCurrentRoundUseCase } from "../../src/round/application/use-cases/get-current-round.use-case";
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
  const useCase = { execute: vi.fn().mockResolvedValue(executeResult) };
  const module = await Test.createTestingModule({
    controllers: [RoundController],
    providers: [{ provide: GetCurrentRoundUseCase, useValue: useCase }],
  }).compile();
  return {
    controller: module.get(RoundController),
    useCase,
  };
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
});
