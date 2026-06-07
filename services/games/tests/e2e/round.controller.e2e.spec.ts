import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/utils/http-exception.filter";
import { Round, RoundStatus } from "../../src/round/domain/round.entity";
import {
  generateServerSeed,
  generateClientSeed,
  generateSeedHash,
  generateCrashPoint,
} from "../../src/round/domain/provably-fair";

let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("games");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(0);
  const port = (app.getHttpServer().address() as { port: number }).port;
  baseUrl = `http://localhost:${port}/games`;
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  const em = app.get(EntityManager).fork();
  await em.nativeDelete(Round, {});
});

function makeCrashedRound(): Round {
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();
  const seedHash = generateSeedHash(serverSeed);
  const crashPoint = generateCrashPoint(serverSeed, clientSeed).toFixed(2);
  const round = Round.create({
    crashPoint,
    seedHash,
    serverSeed,
    clientSeed,
    bettingEndsAt: new Date(Date.now() - 30_000),
  });
  round.start();
  round.crash();
  return round;
}

describe("GET /games/rounds/current", () => {

  it("[E2E-GS-001] returns 200 with { data: null } when no round exists", async () => {
    const res = await fetch(`${baseUrl}/rounds/current`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: null, meta: null, error: null });
  });

  it("[E2E-GS-002] returns a BETTING round with startedAt null and no sensitive fields", async () => {
    const em = app.get(EntityManager).fork();
    const round = Round.create({
      crashPoint: "3.00",
      seedHash: "testhash",
      serverSeed: "srv",
      clientSeed: "cli",
      bettingEndsAt: new Date(Date.now() + 30_000),
    });
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/rounds/current`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;

    expect(data.id).toBe(round.id);
    expect(data.status).toBe("betting");
    expect(data.seedHash).toBe("testhash");
    expect(typeof data.bettingEndsAt).toBe("string");
    expect(data.startedAt).toBeNull();
    expect(data.crashedAt).toBeNull();
    expect(Array.isArray(data.bets)).toBe(true);

    expect(data.serverSeed).toBeUndefined();
    expect(data.clientSeed).toBeUndefined();
    expect(data.crashPoint).toBeUndefined();
  });

  it("[E2E-GS-003] returns an ACTIVE round with startedAt as ISO string", async () => {
    const em = app.get(EntityManager).fork();
    const round = Round.create({
      crashPoint: "5.00",
      seedHash: "activehash",
      serverSeed: "srv",
      clientSeed: "cli",
      bettingEndsAt: new Date(Date.now() - 1_000),
    });
    round.start();
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/rounds/current`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;

    expect(data.status).toBe("active");
    expect(typeof data.startedAt).toBe("string");
    expect(new Date(data.startedAt).toISOString()).toBe(data.startedAt);
    expect(data.crashedAt).toBeNull();
  });
});

describe("GET /games/rounds/history", () => {
  it("[E2E-GS-004] returns 200 with empty data array and total=0 when no rounds exist", async () => {
    const res = await fetch(`${baseUrl}/rounds/history`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.meta.pagination.total).toBe(0);
    expect(body.meta.pagination.page).toBe(1);
    expect(body.meta.pagination.limit).toBe(20);
    expect(body.error).toBeNull();
  });

  it("[E2E-GS-005] returns only CRASHED rounds and excludes BETTING and ACTIVE", async () => {
    const em = app.get(EntityManager).fork();

    const bettingRound = Round.create({
      crashPoint: "2.00",
      seedHash: "betting-hash",
      serverSeed: "betting-server",
      clientSeed: "betting-client",
      bettingEndsAt: new Date(Date.now() + 30_000),
    });

    const activeRound = Round.create({
      crashPoint: "3.00",
      seedHash: "active-hash",
      serverSeed: "active-server",
      clientSeed: "active-client",
      bettingEndsAt: new Date(Date.now() - 30_000),
    });
    activeRound.start();

    const crashed1 = makeCrashedRound();
    const crashed2 = makeCrashedRound();

    await em.persist([bettingRound, activeRound, crashed1, crashed2]).flush();

    const res = await fetch(`${baseUrl}/rounds/history`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.length).toBe(2);
    for (const item of body.data) {
      expect(item.serverSeed).toBeUndefined();
      expect(item.clientSeed).toBeUndefined();
    }
  });

  it("[E2E-GS-006] default pagination meta is correct", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist([makeCrashedRound(), makeCrashedRound(), makeCrashedRound()]).flush();

    const res = await fetch(`${baseUrl}/rounds/history`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.meta.pagination.page).toBe(1);
    expect(body.meta.pagination.limit).toBe(20);
    expect(body.meta.pagination.total).toBe(3);
  });

  it("[E2E-GS-007] respects page=2 and limit=1 returning the second item", async () => {
    const em = app.get(EntityManager).fork();

    const older = makeCrashedRound();
    Object.assign(older, { createdAt: new Date("2026-06-01T10:00:00.000Z") });
    const newer = makeCrashedRound();
    Object.assign(newer, { createdAt: new Date("2026-06-01T10:01:00.000Z") });

    await em.persist([older, newer]).flush();

    const res = await fetch(`${baseUrl}/rounds/history?page=2&limit=1`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(older.id);
    expect(body.meta.pagination.page).toBe(2);
    expect(body.meta.pagination.limit).toBe(1);
    expect(body.meta.pagination.total).toBe(2);
  });

  it("[E2E-GS-008] limit=200 is clamped to 100", async () => {
    const res = await fetch(`${baseUrl}/rounds/history?limit=200`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.meta.pagination.limit).toBe(100);
  });
});

describe("GET /games/rounds/:roundId/verify", () => {
  it("[E2E-GS-009] returns 200 with full verification payload for a CRASHED round", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeCrashedRound();
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/rounds/${round.id}/verify`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.roundId).toBe(round.id);
    expect(body.data.serverSeed).toBe(round.serverSeed);
    expect(body.data.clientSeed).toBe(round.clientSeed);
    expect(body.data.verification.step1_sha256_of_serverSeed).toBeTypeOf("string");
    expect(body.data.verification.step1_matchesSeedHash).toBeTypeOf("boolean");
    expect(body.data.verification.step2_hmac).toBeTypeOf("string");
    expect(body.data.verification.step2_hex8).toBeTypeOf("string");
    expect(body.data.verification.step2_int).toBeTypeOf("number");
    expect(body.data.verification.step3_crashPoint).toBeTypeOf("string");
    expect(body.data.verification.step3_matchesClaimed).toBeTypeOf("boolean");
  });

  it("[E2E-GS-010] step1_matchesSeedHash and step3_matchesClaimed are true for legitimate round", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeCrashedRound();
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/rounds/${round.id}/verify`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.verification.step1_matchesSeedHash).toBe(true);
    expect(body.data.verification.step3_matchesClaimed).toBe(true);
  });

  it("[E2E-GS-011] returns 404 for a non-existent roundId", async () => {
    const res = await fetch(`${baseUrl}/rounds/${crypto.randomUUID()}/verify`);
    expect(res.status).toBe(404);
  });

  it("[E2E-GS-012] returns 404 for a round with status BETTING", async () => {
    const em = app.get(EntityManager).fork();
    const round = Round.create({
      crashPoint: "2.00",
      seedHash: "betting-hash",
      serverSeed: "betting-server",
      clientSeed: "betting-client",
      bettingEndsAt: new Date(Date.now() + 30_000),
    });
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/rounds/${round.id}/verify`);
    expect(res.status).toBe(404);
  });

  it("[E2E-GS-013] returns 422 for an invalid non-UUID roundId", async () => {
    const res = await fetch(`${baseUrl}/rounds/not-a-uuid/verify`);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body).toEqual({
      data: null,
      meta: null,
      error: {
        statusCode: 422,
        error: "Unprocessable Entity",
        message: "Validation failed (uuid is expected)",
      },
    });
  });
});
