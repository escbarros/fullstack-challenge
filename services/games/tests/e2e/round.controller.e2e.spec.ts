import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { Round } from "../../src/round/domain/round.entity";

let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("games");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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
