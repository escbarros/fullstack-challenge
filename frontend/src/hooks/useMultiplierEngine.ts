import { useEffect } from 'react';
import { multiplierAt } from '#/lib/multiplier';
import { useGameStore } from '#/store/game';

export function useMultiplierEngine(): void {
  const status = useGameStore((s) => s.status);
  const startedAt = useGameStore((s) => s.startedAt);
  const setMultiplier = useGameStore((s) => s.setMultiplier);

  useEffect(() => {
    if (status !== 'active' || startedAt == null) return;

    let raf = 0;
    const tick = () => {
      setMultiplier(multiplierAt(Date.now() - startedAt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [status, startedAt, setMultiplier]);
}
