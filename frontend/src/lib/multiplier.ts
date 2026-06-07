export const GROWTH_RATE = Number(import.meta.env.VITE_GROWTH_RATE ?? 0.04);

export function multiplierAt(elapsedMs: number): number {
  return Math.exp((elapsedMs / 1000) * GROWTH_RATE);
}

export function elapsedForMultiplier(multiplier: number): number {
  return (Math.log(multiplier) / GROWTH_RATE) * 1000;
}
