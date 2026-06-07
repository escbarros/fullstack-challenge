import "reflect-metadata";
import { describe, it, expect, vi } from "vitest";
import { GetRoundHistoryUseCase } from "@/round/application/use-cases/get-round-history.use-case";
import { RoundRepository } from "@/round/domain/round.repository";
import { Round } from "@/round/domain/round.entity";

function makeRepository(result = { items: [] as Round[], total: 0 }): RoundRepository {
  return {
    save: vi.fn(),
    findCurrent: vi.fn(),
    findById: vi.fn(),
    findWithLock: vi.fn(),
    findHistory: vi.fn().mockResolvedValue(result),
  } as unknown as RoundRepository;
}

function makeRound(): Round {
  return Round.create({
    crashPoint: "3.14",
    seedHash: "abc123",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date(),
  });
}

describe("GetRoundHistoryUseCase", () => {
  function setup(result = { items: [] as Round[], total: 0 }) {
    const repository = makeRepository(result);
    const useCase = new GetRoundHistoryUseCase(repository);
    return { repository, useCase };
  }

  it("[UT-GS-140] returns items, total, safePage, and safeLimit from repository", async () => {
    const r1 = makeRound();
    const r2 = makeRound();
    const { useCase } = setup({ items: [r1, r2], total: 50 });
    const result = await useCase.execute(1, 20);
    expect(result).toEqual({ items: [r1, r2], total: 50, page: 1, limit: 20 });
  });

  it("[UT-GS-141] calls findHistory with safeLimit and computed offset", async () => {
    const { repository, useCase } = setup();
    await useCase.execute(3, 10);
    expect(repository.findHistory).toHaveBeenCalledWith(10, 20);
  });

  it("[UT-GS-142] clamps page=0 to 1 and offset to 0", async () => {
    const { repository, useCase } = setup();
    const result = await useCase.execute(0, 10);
    expect(repository.findHistory).toHaveBeenCalledWith(10, 0);
    expect(result.page).toBe(1);
  });

  it("[UT-GS-143] clamps page=-5 to 1", async () => {
    const { repository, useCase } = setup();
    const result = await useCase.execute(-5, 10);
    expect(repository.findHistory).toHaveBeenCalledWith(10, 0);
    expect(result.page).toBe(1);
  });

  it("[UT-GS-144] clamps limit=200 to 100", async () => {
    const { repository, useCase } = setup();
    const result = await useCase.execute(1, 200);
    expect(repository.findHistory).toHaveBeenCalledWith(100, 0);
    expect(result.limit).toBe(100);
  });

  it("[UT-GS-145] clamps limit=0 to 1", async () => {
    const { repository, useCase } = setup();
    const result = await useCase.execute(1, 0);
    expect(repository.findHistory).toHaveBeenCalledWith(1, 0);
    expect(result.limit).toBe(1);
  });

  it("[UT-GS-146] offset = (safePage - 1) × safeLimit", async () => {
    const { repository, useCase } = setup();
    await useCase.execute(4, 25);
    expect(repository.findHistory).toHaveBeenCalledWith(25, 75);
  });

  it("[UT-GS-147] result.page reflects safePage not raw input", async () => {
    const { useCase } = setup();
    const result = await useCase.execute(0, 10);
    expect(result.page).toBe(1);
  });
});
