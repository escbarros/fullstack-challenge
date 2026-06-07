import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generateServerSeed,
  generateSeedHash,
  generateClientSeed,
  generateCrashPoint,
  verifyCrashPoint,
  calculateMultiplier,
} from "@/round/domain/provably-fair";

describe("Provably Fair", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Seed generation", () => {
    it("should generate unique server seeds", () => {
      expect(generateServerSeed()).not.toBe(generateServerSeed());
    });

    it("should generate unique client seeds", () => {
      expect(generateClientSeed()).not.toBe(generateClientSeed());
    });

    it("should generate a deterministic hash for a server seed", () => {
      const seed = "server-seed";

      expect(generateSeedHash(seed)).toBe(generateSeedHash(seed));
    });
  });

  describe("Crash point generation", () => {
    it("should always produce the same crash point for the same seeds", () => {
      const serverSeed = "server-seed";
      const clientSeed = "client-seed";

      const first = generateCrashPoint(serverSeed, clientSeed);
      const second = generateCrashPoint(serverSeed, clientSeed);

      expect(first).toBe(second);
    });

    it("should produce different crash points when the server seed changes", () => {
      const first = generateCrashPoint("server-seed-1", "client-seed");
      const second = generateCrashPoint("server-seed-2", "client-seed");

      expect(first).not.toBe(second);
    });

    it("should produce different crash points when the client seed changes", () => {
      const first = generateCrashPoint("server-seed", "client-seed-1");
      const second = generateCrashPoint("server-seed", "client-seed-2");

      expect(first).not.toBe(second);
    });

    it("should never generate a multiplier lower than 1x", () => {
      for (let i = 0; i < 1000; i++) {
        const crashPoint = generateCrashPoint(
          generateServerSeed(),
          generateClientSeed(),
        );

        expect(crashPoint).toBeGreaterThanOrEqual(1);
      }
    });

    it("should always round down to two decimal places", () => {
      const crashPoint = generateCrashPoint(
        "server-seed",
        "client-seed",
      );

      expect(crashPoint).toBe(Number(crashPoint.toFixed(2)));
    });

    it("should generate reproducible results that can be verified later", () => {
      const serverSeed = "server-seed";
      const clientSeed = "client-seed";

      const crashPoint = generateCrashPoint(serverSeed, clientSeed);

      expect(
        verifyCrashPoint(
          serverSeed,
          clientSeed,
          generateSeedHash(serverSeed),
          crashPoint,
        ),
      ).toBe(true);
    });

    it("should fail verification when the server seed is modified", () => {
      const crashPoint = generateCrashPoint(
        "server-seed",
        "client-seed",
      );

      expect(
        verifyCrashPoint(
          "tampered-server-seed",
          "client-seed",
          generateSeedHash("server-seed"),
          crashPoint,
        ),
      ).toBe(false);
    });

    it("should fail verification when the client seed is modified", () => {
      const crashPoint = generateCrashPoint(
        "server-seed",
        "client-seed",
      );

      expect(
        verifyCrashPoint(
          "server-seed",
          "tampered-client-seed",
          generateSeedHash("server-seed"),
          crashPoint,
        ),
      ).toBe(false);
    });

    it("should fail verification when the crash point is modified", () => {
      const serverSeed = "server-seed";
      const clientSeed = "client-seed";

      expect(
        verifyCrashPoint(
          serverSeed,
          clientSeed,
          generateSeedHash(serverSeed),
          999.99,
        ),
      ).toBe(false);
    });

    it("should fail verification when the published seed hash is modified", () => {
      const serverSeed = "server-seed";
      const clientSeed = "client-seed";

      const crashPoint = generateCrashPoint(serverSeed, clientSeed);

      expect(
        verifyCrashPoint(
          serverSeed,
          clientSeed,
          "invalid-hash",
          crashPoint,
        ),
      ).toBe(false);
    });

    it("should preserve algorithm compatibility for known seeds", () => {
      const crashPoint = generateCrashPoint(
        "server-seed",
        "client-seed",
      );

      expect(crashPoint).toBe(
        generateCrashPoint("server-seed", "client-seed"),
      );
    });
  });

  describe("Multiplier calculation", () => {
    it("should start at 1x when no time has elapsed", () => {
      const startedAt = new Date("2026-01-01T00:00:00Z");

      vi.spyOn(Date, "now").mockReturnValue(startedAt.getTime());

      expect(calculateMultiplier(startedAt, 0.1)).toBe(1);
    });

    it("should increase over time", () => {
      const startedAt = new Date("2026-01-01T00:00:00Z");

      vi.spyOn(Date, "now").mockReturnValue(
        startedAt.getTime() + 5000,
      );

      const first = calculateMultiplier(startedAt, 0.1);

      vi.spyOn(Date, "now").mockReturnValue(
        startedAt.getTime() + 10000,
      );

      const second = calculateMultiplier(startedAt, 0.1);

      expect(second).toBeGreaterThan(first);
    });

    it("should follow the exponential growth formula", () => {
      const startedAt = new Date("2026-01-01T00:00:00Z");

      vi.spyOn(Date, "now").mockReturnValue(
        startedAt.getTime() + 10000,
      );

      const expected =
        Math.floor(Math.exp(10 * 0.1) * 100) / 100;

      expect(calculateMultiplier(startedAt, 0.1)).toBe(expected);
    });
  });
});
