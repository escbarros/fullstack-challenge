import "reflect-metadata";
import { describe, it, expect, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { VerifyRoundUseCase } from "@/round/application/use-cases/verify-round.use-case";
import { Round, RoundRepository, RoundStatus } from "@/round/domain";
import {
  generateServerSeed,
  generateClientSeed,
  generateSeedHash,
  generateCrashPoint,
} from "@/round/domain/provably-fair";

function makeVerifiableRound(): Round {
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();
  const seedHash = generateSeedHash(serverSeed);
  const crashPoint = generateCrashPoint(serverSeed, clientSeed).toFixed(2);
  const round = Round.create({
    crashPoint,
    seedHash,
    serverSeed,
    clientSeed,
    bettingEndsAt: new Date(Date.now() - 60_000),
  });
  round.start();
  round.crash();
  return round;
}

function makeRepository(round: Round | null): RoundRepository {
  return {
    save: vi.fn(),
    findCurrent: vi.fn(),
    findById: vi.fn().mockResolvedValue(round),
    findWithLock: vi.fn(),
    findHistory: vi.fn(),
  } as unknown as RoundRepository;
}

describe("VerifyRoundUseCase", () => {
  it("[UT-GS-148] throws NotFoundException when round is null", async () => {
    const repository = makeRepository(null);
    const useCase = new VerifyRoundUseCase(repository);

    await expect(useCase.execute(crypto.randomUUID())).rejects.toThrow(NotFoundException);
  });

  it("[UT-GS-149] throws NotFoundException when round status is BETTING", async () => {
    const round = Round.create({
      crashPoint: "2.00",
      seedHash: "hash",
      serverSeed: "server",
      clientSeed: "client",
      bettingEndsAt: new Date(Date.now() + 30_000),
    });
    const repository = makeRepository(round);
    const useCase = new VerifyRoundUseCase(repository);

    await expect(useCase.execute(round.id)).rejects.toThrow(NotFoundException);
  });

  it("[UT-GS-150] throws NotFoundException when round status is ACTIVE", async () => {
    const round = Round.create({
      crashPoint: "2.00",
      seedHash: "hash",
      serverSeed: "server",
      clientSeed: "client",
      bettingEndsAt: new Date(Date.now() - 30_000),
    });
    round.start();
    const repository = makeRepository(round);
    const useCase = new VerifyRoundUseCase(repository);

    await expect(useCase.execute(round.id)).rejects.toThrow(NotFoundException);
  });

  it("[UT-GS-151] result contains roundId, crashPoint, seedHash, serverSeed, clientSeed", async () => {
    const round = makeVerifiableRound();
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.roundId).toBe(round.id);
    expect(result.crashPoint).toBe(round.crashPoint);
    expect(result.seedHash).toBe(round.seedHash);
    expect(result.serverSeed).toBe(round.serverSeed);
    expect(result.clientSeed).toBe(round.clientSeed);
  });

  it("[UT-GS-152] step1_sha256_of_serverSeed equals sha256 of serverSeed", async () => {
    const round = makeVerifiableRound();
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step1_sha256_of_serverSeed).toBe(generateSeedHash(round.serverSeed));
  });

  it("[UT-GS-153] step1_matchesSeedHash is true for a legitimately generated round", async () => {
    const round = makeVerifiableRound();
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step1_matchesSeedHash).toBe(true);
  });

  it("[UT-GS-154] step1_matchesSeedHash is false when seedHash is tampered", async () => {
    const round = makeVerifiableRound();
    round.seedHash = "deadbeef";
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step1_matchesSeedHash).toBe(false);
  });

  it("[UT-GS-155] step2 fields are computed correctly", async () => {
    const round = makeVerifiableRound();
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step2_hex8).toBe(result.verification.step2_hmac.slice(0, 8));
    expect(result.verification.step2_int).toBe(parseInt(result.verification.step2_hex8, 16));
  });

  it("[UT-GS-156] step3_crashPoint equals generateCrashPoint().toFixed(2)", async () => {
    const round = makeVerifiableRound();
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step3_crashPoint).toBe(
      generateCrashPoint(round.serverSeed, round.clientSeed).toFixed(2),
    );
  });

  it("[UT-GS-157] step3_matchesClaimed is true for a legitimately generated round", async () => {
    const round = makeVerifiableRound();
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step3_matchesClaimed).toBe(true);
  });

  it("[UT-GS-158] step3_matchesClaimed is false when stored crashPoint is tampered", async () => {
    const round = makeVerifiableRound();
    Object.assign(round, { _crashPoint: "9999.99" });
    const useCase = new VerifyRoundUseCase(makeRepository(round));

    const result = await useCase.execute(round.id);

    expect(result.verification.step3_matchesClaimed).toBe(false);
  });
});
