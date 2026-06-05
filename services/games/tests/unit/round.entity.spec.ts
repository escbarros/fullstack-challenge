import "reflect-metadata";
import { describe, it, expect } from "vitest";
import { Round, RoundStatus } from "@/round/domain/round.entity";
import { InvalidTransitionError } from "@/round/domain/invalid-transition.error";
import { RoundStateMachine } from "@/round/domain/round-state-machine";

function makeRound(
  overrides: Partial<Omit<Round, "crashPoint">> & { crashPoint?: string } = {},
): Round {
  const { crashPoint = "2.50", ...rest } = overrides;
  const round = Round.create({
    crashPoint,
    seedHash: "abc",
    serverSeed: "srv",
    clientSeed: "cli",
    bettingEndsAt: new Date(Date.now() + 10_000),
  });
  return Object.assign(round, rest);
}

describe("RoundStateMachine", () => {
  describe("canPlaceBet", () => {
    it("[UT-GS-012] returns true when status is BETTING", () => {
      const round = makeRound({ status: RoundStatus.BETTING });
      expect(RoundStateMachine.canPlaceBet(round)).toBe(true);
    });

    it("[UT-GS-013] returns false when status is ACTIVE", () => {
      const round = makeRound({ status: RoundStatus.ACTIVE });
      expect(RoundStateMachine.canPlaceBet(round)).toBe(false);
    });

    it("[UT-GS-014] returns false when status is CRASHED", () => {
      const round = makeRound({ status: RoundStatus.CRASHED });
      expect(RoundStateMachine.canPlaceBet(round)).toBe(false);
    });
  });

  describe("isCrashReached", () => {
    it("[UT-GS-020] returns true when multiplier >= crashPoint", () => {
      const round = makeRound({ crashPoint: "2.50" });
      expect(RoundStateMachine.isCrashReached(round, 2.50)).toBe(true);
      expect(RoundStateMachine.isCrashReached(round, 3.00)).toBe(true);
    });

    it("[UT-GS-021] returns false when multiplier < crashPoint", () => {
      const round = makeRound({ crashPoint: "2.50" });
      expect(RoundStateMachine.isCrashReached(round, 2.49)).toBe(false);
    });
  });
});

describe("Round entity", () => {
  describe("initial state", () => {
    it("[UT-GS-070] startedAt is undefined when round is created", () => {
      const round = makeRound();
      expect(round.startedAt).toBeUndefined();
    });

    it("[UT-GS-071] crashedAt is undefined when round is created", () => {
      const round = makeRound();
      expect(round.crashedAt).toBeUndefined();
    });

    it("[UT-GS-072] crashPoint is exposed as a read-only property (no setter)", () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        Round.prototype,
        "crashPoint",
      );
      expect(descriptor?.get).toBeInstanceOf(Function);
      expect(descriptor?.set).toBeUndefined();
    });
  });

  describe("start()", () => {
    it("[UT-GS-060] transitions status from BETTING to ACTIVE", () => {
      const round = makeRound();
      round.start();
      expect(round.status).toBe(RoundStatus.ACTIVE);
    });

    it("[UT-GS-061] sets startedAt to a non-null Date", () => {
      const round = makeRound();
      round.start();
      expect(round.startedAt).toBeInstanceOf(Date);
    });

    it("[UT-GS-062] throws InvalidTransitionError when already ACTIVE", () => {
      const round = makeRound({ status: RoundStatus.ACTIVE });
      expect(() => round.start()).toThrow(InvalidTransitionError);
    });

    it("[UT-GS-063] throws InvalidTransitionError when status is CRASHED", () => {
      const round = makeRound({ status: RoundStatus.CRASHED });
      expect(() => round.start()).toThrow(InvalidTransitionError);
    });
  });

  describe("crash()", () => {
    it("[UT-GS-064] transitions status from ACTIVE to CRASHED", () => {
      const round = makeRound({ status: RoundStatus.ACTIVE });
      round.crash();
      expect(round.status).toBe(RoundStatus.CRASHED);
    });

    it("[UT-GS-065] sets crashedAt to a non-null Date", () => {
      const round = makeRound({ status: RoundStatus.ACTIVE });
      round.crash();
      expect(round.crashedAt).toBeInstanceOf(Date);
    });

    it("[UT-GS-066] throws InvalidTransitionError when status is from BETTING to CRASHED", () => {
      const round = makeRound();
      expect(() => round.crash()).toThrow(InvalidTransitionError);
    });

    it("[UT-GS-067] throws InvalidTransitionError when already CRASHED", () => {
      const round = makeRound({ status: RoundStatus.CRASHED });
      expect(() => round.crash()).toThrow(InvalidTransitionError);
    });
  });

  describe("isBettingOpen()", () => {
    it("[UT-GS-068] returns true when now is before bettingEndsAt", () => {
      const bettingEndsAt = new Date(Date.now() + 5_000);
      const round = makeRound({ bettingEndsAt });
      const now = new Date(bettingEndsAt.getTime() - 1);
      expect(round.isBettingOpen(now)).toBe(true);
    });

    it("[UT-GS-069] returns false when now is at or after bettingEndsAt", () => {
      const bettingEndsAt = new Date(Date.now() + 5_000);
      const round = makeRound({ bettingEndsAt });

      expect(round.isBettingOpen(bettingEndsAt)).toBe(false);
      expect(round.isBettingOpen(new Date(bettingEndsAt.getTime() + 1))).toBe(false);
    });
  });
});
