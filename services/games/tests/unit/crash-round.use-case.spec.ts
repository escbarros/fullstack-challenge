import "reflect-metadata";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrashRoundUseCase } from "@/round/application/crash-round.use-case";
import { RoundRepository } from "@/round/domain/round.repository";
import { Round, RoundStatus } from "@/round/domain/round.entity";
import { RoundCannotCrashError } from "@/round/domain/errors/round-cannot-crash.error";
import { RoundAlreadyCrashedError } from "@/round/domain/errors/round-already-crashed.error";
import { BetRepository } from "@/bet/domain/bet.repository";
import { Bet, BetStatus } from "@/bet/domain/bet.entity";
import { GameGateway } from "@/round/presentation/game.gateway";
import { StartRoundUseCase } from "@/round/application/start-round.use-case";

const ROUND_ID = "11111111-1111-1111-1111-111111111111";

function makeRound(status = RoundStatus.ACTIVE): Round {
  const round = Round.create({
    crashPoint: "2.50",
    seedHash: "seedhash-abc",
    serverSeed: "serverseed-abc",
    clientSeed: "clientseed-abc",
    bettingEndsAt: new Date(Date.now() + 10_000),
  });
  return Object.assign(round, { id: ROUND_ID, status });
}

function makeBet(status: BetStatus): Bet {
  return Object.assign(new Bet(), {
    id: crypto.randomUUID(),
    status,
    amountCents: "1000",
    playerId: "player-1",
    round: makeRound(),
  });
}

function makeRoundRepository(round: Round | null): RoundRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findWithLock: vi.fn().mockResolvedValue(round),
    findCurrent: vi.fn(),
    findById: vi.fn(),
    findHistory: vi.fn(),
  } as unknown as RoundRepository;
}

function makeBetRepository(bets: Bet[] = []): BetRepository {
  return {
    findActiveByRoundId: vi.fn().mockResolvedValue(bets),
  } as unknown as BetRepository;
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

function makeStartRoundUseCase(): StartRoundUseCase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
  } as unknown as StartRoundUseCase;
}

describe("CrashRoundUseCase", () => {
  let gateway: GameGateway;
  let startRoundUseCase: StartRoundUseCase;

  beforeEach(() => {
    gateway = makeGateway();
    startRoundUseCase = makeStartRoundUseCase();
  });

  it("[UT-GS-105] returns early without side-effects when round is not found", async () => {
    const roundRepository = makeRoundRepository(null);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    expect(roundRepository.save).not.toHaveBeenCalled();
    expect(gateway.emitRoundCrashed).not.toHaveBeenCalled();
    expect(startRoundUseCase.execute).not.toHaveBeenCalled();
  });

  it("[UT-GS-106] transitions the round to CRASHED and persists it", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    expect(round.status).toBe(RoundStatus.CRASHED);
    expect(roundRepository.save).toHaveBeenCalledOnce();
    expect(roundRepository.save).toHaveBeenCalledWith(round);
  });

  it("[UT-GS-107] CONFIRMED bet is marked LOST", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const bet = makeBet(BetStatus.CONFIRMED);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository([bet]);
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    expect(bet.status).toBe(BetStatus.LOST);
  });

  it("[UT-GS-108] PENDING bet is cancelled", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const bet = makeBet(BetStatus.PENDING);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository([bet]);
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    expect(bet.status).toBe(BetStatus.CANCELLED);
  });

  it("[UT-GS-109] already-terminal bets are skipped without mutation", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const lostBet = makeBet(BetStatus.LOST);
    const cancelledBet = makeBet(BetStatus.CANCELLED);
    const cashedOutBet = makeBet(BetStatus.CASHEDOUT);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository([lostBet, cancelledBet, cashedOutBet]);
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    expect(lostBet.status).toBe(BetStatus.LOST);
    expect(cancelledBet.status).toBe(BetStatus.CANCELLED);
    expect(cashedOutBet.status).toBe(BetStatus.CASHEDOUT);
  });

  it("[UT-GS-110] save() is called before emitRoundCrashed()", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    const callOrder: string[] = [];
    vi.mocked(roundRepository.save).mockImplementation(async () => {
      callOrder.push("save");
    });
    vi.mocked(gateway.emitRoundCrashed).mockImplementation(() => {
      callOrder.push("emit");
    });

    await useCase.execute(ROUND_ID);

    expect(callOrder[0]).toBe("save");
    expect(callOrder[1]).toBe("emit");
  });

  it("[UT-GS-111] emitRoundCrashed() is called with correct payload", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    expect(gateway.emitRoundCrashed).toHaveBeenCalledOnce();
    expect(gateway.emitRoundCrashed).toHaveBeenCalledWith({
      roundId: round.id,
      crashPoint: parseFloat(round.crashPoint),
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      seedHash: round.seedHash,
    });
  });

  it("[UT-GS-112] call order is save → emit → startRound", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    const callOrder: string[] = [];
    vi.mocked(roundRepository.save).mockImplementation(async () => {
      callOrder.push("save");
    });
    vi.mocked(gateway.emitRoundCrashed).mockImplementation(() => {
      callOrder.push("emit");
    });
    vi.mocked(startRoundUseCase.execute).mockImplementation(async () => {
      callOrder.push("startRound");
      return undefined as any;
    });

    await useCase.execute(ROUND_ID);

    expect(callOrder).toEqual(["save", "emit", "startRound"]);
  });

  it("[UT-GS-113] throws RoundCannotCrashError when round is in BETTING status", async () => {
    const round = makeRound(RoundStatus.BETTING);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await expect(useCase.execute(ROUND_ID)).rejects.toThrow(RoundCannotCrashError);
    expect(roundRepository.save).not.toHaveBeenCalled();
    expect(gateway.emitRoundCrashed).not.toHaveBeenCalled();
  });

  it("[UT-GS-114] throws RoundAlreadyCrashedError when round is already CRASHED", async () => {
    const round = makeRound(RoundStatus.CRASHED);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await expect(useCase.execute(ROUND_ID)).rejects.toThrow(RoundAlreadyCrashedError);
    expect(roundRepository.save).not.toHaveBeenCalled();
    expect(gateway.emitRoundCrashed).not.toHaveBeenCalled();
  });

  it("[UT-GS-115] crashPoint in emitRoundCrashed payload is a number >= 1", async () => {
    const round = makeRound(RoundStatus.ACTIVE);
    const roundRepository = makeRoundRepository(round);
    const betRepository = makeBetRepository();
    const useCase = new CrashRoundUseCase(roundRepository, betRepository, gateway, startRoundUseCase);

    await useCase.execute(ROUND_ID);

    const payload = vi.mocked(gateway.emitRoundCrashed).mock.calls[0][0];
    console.log(payload)
    expect(typeof payload.crashPoint).toBe("number");
    expect(payload.crashPoint).toBeGreaterThanOrEqual(1);
  });
});
