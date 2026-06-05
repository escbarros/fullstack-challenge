import { createHash, createHmac, randomBytes } from "crypto";

const HOUSE_EDGE = 0.01;

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function generateSeedHash(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

export function generateClientSeed(): string {
  return randomBytes(16).toString("hex");
}

export function generateCrashPoint(serverSeed: string, clientSeed: string): number {
  const hmac = createHmac("sha256", serverSeed).update(clientSeed).digest("hex");
  const int = parseInt(hmac.slice(0, 8), 16);
  const raw = (Math.pow(2, 32) / (int + 1)) * (1 - HOUSE_EDGE);
  return Math.floor(Math.max(1, raw) * 100) / 100;
}

export function verifyCrashPoint(
  serverSeed: string,
  clientSeed: string,
  seedHash: string,
  crashPoint: number,
): boolean {
  return (
    generateSeedHash(serverSeed) === seedHash &&
    generateCrashPoint(serverSeed, clientSeed) === crashPoint
  );
}

export function calculateMultiplier(startedAt: Date, growthRate: number): number {
  const elapsedSeconds = (Date.now() - startedAt.getTime()) / 1000;
  return Math.floor(Math.exp(elapsedSeconds * growthRate) * 100) / 100;
}
