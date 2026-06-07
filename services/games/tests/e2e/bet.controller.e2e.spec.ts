import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/utils/http-exception.filter";
import { Round, RoundStatus } from "../../src/round/domain/round.entity";
import { Bet, BetStatus } from "../../src/bet/domain/bet.entity";
import { Outbox, OutboxEventType } from "../../src/outbox/domain/outbox.entity";
import { WalletEventConsumer } from "../../src/bet/infrastructure/wallet-event.consumer";
import {
  generateServerSeed,
  generateClientSeed,
  generateSeedHash,
  generateCrashPoint,
} from "../../src/round/domain/provably-fair";

let app: INestApplication;
let baseUrl: string;

const PLAYER_ID = crypto.randomUUID();
const USERNAME = "testplayer";

function makeJwt(playerId: string, username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: playerId, preferred_username: username }),
  ).toString("base64url");
  return `Bearer ${header}.${payload}.sig`;
}

function makeBettingRound(bettingWindowMs = 30_000): Round {
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();
  return Round.create({
    crashPoint: generateCrashPoint(serverSeed, clientSeed).toFixed(2),
    seedHash: generateSeedHash(serverSeed),
    serverSeed,
    clientSeed,
    bettingEndsAt: new Date(Date.now() + bettingWindowMs),
  });
}

function makeActiveRound(): Round {
  const round = makeBettingRound(-30_000);
  round.start();
  return round;
}

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
  await em.nativeDelete(Bet, {});
  await em.nativeDelete(Outbox, {});
  await em.nativeDelete(Round, {});
});

async function seedConfirmedBet(
  round: Round,
  playerId = PLAYER_ID,
  username = USERNAME,
  amountCents = 1_000,
): Promise<Bet> {
  const em = app.get(EntityManager).fork();
  const bet = new Bet();
  bet.round = round as never;
  bet.playerId = playerId;
  bet.username = username;
  bet.amountCents = String(amountCents);
  bet.confirm();
  await em.persist(bet).flush();
  return bet;
}

// ---------------------------------------------------------------------------
// POST /games/bets
// ---------------------------------------------------------------------------

describe("POST /games/bets", () => {
  it("[E2E-GS-014] returns 201 with bet in PENDING status when a betting round is open", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeBettingRound();
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 1_000 }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.betId).toBeTypeOf("string");
    expect(body.data.roundId).toBe(round.id);
    expect(body.data.playerId).toBe(PLAYER_ID);
    expect(body.data.amountCents).toBe("1000");
    expect(body.data.status).toBe("pending");
    expect(body.meta).toBeNull();
    expect(body.error).toBeNull();
  });

  it("[E2E-GS-015] persists a wallet.debit outbox entry atomically with the bet", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeBettingRound();
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 500 }),
    });

    expect(res.status).toBe(201);
    const { data } = await res.json();

    const readEm = app.get(EntityManager).fork();
    const outbox = await readEm.findOne(Outbox, {
      idempotencyKey: `wallet.debit:${data.betId}`,
    });

    expect(outbox).not.toBeNull();
    expect(outbox!.eventType).toBe(OutboxEventType.WALLET_DEBIT);
    const payload = outbox!.payload as { data: { betId: string; amountCents: number } };
    expect(payload.data.betId).toBe(data.betId);
    expect(payload.data.amountCents).toBe(500);
  });

  it("[E2E-GS-016] returns 404 NO_ACTIVE_BETTING_ROUND when no round exists", async () => {
    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 1_000 }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error.message).toBe("NO_ACTIVE_BETTING_ROUND");
  });

  it("[E2E-GS-017] returns 404 NO_ACTIVE_BETTING_ROUND when the current round is ACTIVE", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist(makeActiveRound()).flush();

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 1_000 }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toBe("NO_ACTIVE_BETTING_ROUND");
  });

  it("[E2E-GS-018] returns 409 BETTING_CLOSED when bettingEndsAt is in the past but round is still BETTING", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist(makeBettingRound(-5_000)).flush();

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 1_000 }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toBe("BETTING_CLOSED");
  });

  it("[E2E-GS-019] returns 409 DUPLICATE_BET when the player already has an active bet in the round", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist(makeBettingRound()).flush();

    const headers = {
      Authorization: makeJwt(PLAYER_ID, USERNAME),
      "Content-Type": "application/json",
    };

    await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amountCents: 1_000 }),
    });

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amountCents: 500 }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toBe("DUPLICATE_BET");
  });

  it("[E2E-GS-020] returns 400 when amountCents is not a number", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist(makeBettingRound()).flush();

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: "not-a-number" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.data).toBeNull();
    expect(body.error.statusCode).toBe(400);
  });

  it("[E2E-GS-021] returns 400 when amountCents is absent", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist(makeBettingRound()).flush();

    const res = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /games/bets/:roundId/cashout
// ---------------------------------------------------------------------------

describe("POST /games/bets/:roundId/cashout", () => {
  it("[E2E-GS-022] returns 200 with CASHEDOUT status, multiplier, and payout", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();
    await seedConfirmedBet(round);

    const res = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("cashedout");
    expect(body.data.cashoutMultiplier).toBeTypeOf("string");
    expect(body.data.payoutCents).toBeTypeOf("string");
    expect(Number(body.data.payoutCents)).toBeGreaterThanOrEqual(1_000);
    expect(body.meta).toBeNull();
    expect(body.error).toBeNull();
  });

  it("[E2E-GS-023] payoutCents equals floor(amountCents × cashoutMultiplier)", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();
    await seedConfirmedBet(round, PLAYER_ID, USERNAME, 1_000);

    const res = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(200);
    const { data } = await res.json();
    const expectedPayout = Math.floor(1_000 * parseFloat(data.cashoutMultiplier));
    expect(Number(data.payoutCents)).toBe(expectedPayout);
  });

  it("[E2E-GS-024] creates a wallet.credit outbox entry atomically with the cashout", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();
    const bet = await seedConfirmedBet(round);

    await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    const readEm = app.get(EntityManager).fork();
    const outbox = await readEm.findOne(Outbox, {
      idempotencyKey: `wallet.credit:${bet.id}`,
    });

    expect(outbox).not.toBeNull();
    expect(outbox!.eventType).toBe(OutboxEventType.WALLET_CREDIT);
    const payload = outbox!.payload as { data: { betId: string } };
    expect(payload.data.betId).toBe(bet.id);
  });

  it("[E2E-GS-025] returns 404 BET_NOT_FOUND when player has no active bet in the round", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();

    const res = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toBe("BET_NOT_FOUND");
  });

  it("[E2E-GS-026] returns 409 BET_NOT_CONFIRMED when bet is still PENDING", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();

    const bet = new Bet();
    bet.round = round as never;
    bet.playerId = PLAYER_ID;
    bet.username = USERNAME;
    bet.amountCents = "1000";
    await em.persist(bet).flush();

    const res = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toBe("BET_NOT_CONFIRMED");
  });

  it("[E2E-GS-027] returns 409 ROUND_NOT_ACTIVE when the round has already crashed", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();
    await seedConfirmedBet(round);

    await em.nativeUpdate(Round, { id: round.id }, { status: RoundStatus.CRASHED, crashedAt: new Date() });

    const res = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.message).toBe("ROUND_NOT_ACTIVE");
  });

  it("[E2E-GS-028] returns 404 BET_NOT_FOUND when roundId does not exist", async () => {
    const res = await fetch(`${baseUrl}/bets/${crypto.randomUUID()}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toBe("BET_NOT_FOUND");
  });

  it("[E2E-GS-029] returns 422 for a non-UUID roundId", async () => {
    const res = await fetch(`${baseUrl}/bets/not-a-uuid/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

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

// ---------------------------------------------------------------------------
// Lifecycle integration
// ---------------------------------------------------------------------------

describe("Bet lifecycle integration", () => {
  it("[E2E-GS-030] wallet rejects debit → bet transitions to CANCELLED (insufficient balance)", async () => {
    const em = app.get(EntityManager).fork();
    await em.persist(makeBettingRound()).flush();

    const placeRes = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 1_000 }),
    });
    expect(placeRes.status).toBe(201);
    const { data } = await placeRes.json();

    const consumer = app.get(WalletEventConsumer);
    await consumer.onDebitFailed({
      betId: data.betId,
      playerId: PLAYER_ID,
      reason: "INSUFFICIENT_BALANCE",
    });

    const readEm = app.get(EntityManager).fork();
    const bet = await readEm.findOne(Bet, { id: data.betId });
    expect(bet!.status).toBe(BetStatus.CANCELLED);
  });

  it("[E2E-GS-031] round crashes → confirmed bet is marked LOST, cashout returns 404", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeActiveRound();
    await em.persist(round).flush();
    const bet = await seedConfirmedBet(round);

    await em.nativeUpdate(Round, { id: round.id }, { status: RoundStatus.CRASHED, crashedAt: new Date() });
    await em.nativeUpdate(Bet, { id: bet.id }, { status: BetStatus.LOST });

    const readEm = app.get(EntityManager).fork();
    const settled = await readEm.findOne(Bet, { id: bet.id });
    expect(settled!.status).toBe(BetStatus.LOST);

    // LOST bet is not found by findActiveByRoundAndPlayer (filters CONFIRMED|PENDING only)
    const res = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.message).toBe("BET_NOT_FOUND");
  });

  it("[E2E-GS-032] happy path: bet → wallet confirms → round starts → cashout → wallet.credit outbox created", async () => {
    const em = app.get(EntityManager).fork();
    const round = makeBettingRound();
    await em.persist(round).flush();

    // 1. Place bet
    const placeRes = await fetch(`${baseUrl}/bets`, {
      method: "POST",
      headers: {
        Authorization: makeJwt(PLAYER_ID, USERNAME),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amountCents: 2_000 }),
    });
    expect(placeRes.status).toBe(201);
    const { data: betData } = await placeRes.json();
    expect(betData.status).toBe("pending");

    // 2. Wallet confirms debit → bet becomes CONFIRMED
    const consumer = app.get(WalletEventConsumer);
    await consumer.onDebitSuccess({
      betId: betData.betId,
      playerId: PLAYER_ID,
      balanceCents: "8000",
    });

    // 3. Scheduler transitions round to ACTIVE
    await em.nativeUpdate(Round, { id: round.id }, {
      status: RoundStatus.ACTIVE,
      startedAt: new Date(Date.now() - 3_000),
    });

    // 4. Player cashes out
    const cashoutRes = await fetch(`${baseUrl}/bets/${round.id}/cashout`, {
      method: "POST",
      headers: { Authorization: makeJwt(PLAYER_ID, USERNAME) },
    });
    expect(cashoutRes.status).toBe(200);
    const { data: cashoutData } = await cashoutRes.json();
    expect(cashoutData.status).toBe("cashedout");
    expect(Number(cashoutData.payoutCents)).toBeGreaterThanOrEqual(2_000);

    // 5. Outbox entry for wallet credit exists
    const readEm = app.get(EntityManager).fork();
    const outbox = await readEm.findOne(Outbox, {
      idempotencyKey: `wallet.credit:${betData.betId}`,
    });
    expect(outbox).not.toBeNull();
    expect(outbox!.eventType).toBe(OutboxEventType.WALLET_CREDIT);
    const payload = outbox!.payload as { data: { payoutCents: string } };
    expect(payload.data.payoutCents).toBe(cashoutData.payoutCents);
  });
});
