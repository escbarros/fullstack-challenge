import { useEffect } from 'react';
import { socket } from '#/lib/socket';
import { apiFetch } from '#/lib/api';
import { useGameStore } from '#/store/game';

interface CurrentRoundResponse {
  id: string;
  status: 'BETTING' | 'ACTIVE' | 'CRASHED';
  seedHash: string;
  bettingEndsAt?: string;
  startedAt?: string;
  crashPoint?: number;
}

async function hydrateFromRest() {
  const store = useGameStore.getState();
  try {
    const round = await apiFetch<CurrentRoundResponse>('/games/rounds/current');
    const status = round.status.toLowerCase() as 'betting' | 'active' | 'crashed';

    if (status === 'betting' && round.bettingEndsAt) {
      store.setRoundBetting({ roundId: round.id, seedHash: round.seedHash, bettingEndsAt: round.bettingEndsAt });
    } else if (status === 'active' && round.startedAt) {
      store.setRoundStarted({ roundId: round.id, startedAt: round.startedAt });
    } else if (status === 'crashed' && round.crashPoint != null) {
      store.setRoundCrashed({ roundId: round.id, crashPoint: round.crashPoint, serverSeed: '', clientSeed: '', seedHash: round.seedHash });
    }
  } catch (error: any){
    // No current round — stay idle
    console.error(error)
  }
}

export function useGameSocket(): void {
  const store = useGameStore.getState;

  useEffect(() => {
    socket.connect();

    socket.on('connect', hydrateFromRest);
    socket.on('reconnect', hydrateFromRest);

    socket.on('round:betting', (payload: { roundId: string; seedHash: string; bettingEndsAt: string }) => {
      store().setRoundBetting(payload);
    });

    socket.on('round:started', (payload: { roundId: string; startedAt: string }) => {
      store().setRoundStarted(payload);
    });

    socket.on('round:crashed', (payload: { roundId: string; crashPoint: number; serverSeed: string; clientSeed: string; seedHash: string }) => {
      new Audio('/assets/sounds/crash-sound.mp3').play().catch((e) => console.error('Error playing crash sound:', e));
      store().setRoundCrashed(payload);
      store().prependHistory({
        id: payload.roundId,
        crashPoint: payload.crashPoint,
        seedHash: payload.seedHash,
      });
    });

    socket.on('round:bet', (payload: { roundId: string; betId: string; playerId: string; username: string; amountCents: number; status: string }) => {
      store().addBet({
        betId: payload.betId,
        playerId: payload.playerId,
        username: payload.username,
        amountCents: payload.amountCents,
        status: payload.status as 'pending' | 'confirmed',
      });
    });

    socket.on('round:cashout', (payload: { roundId: string; playerId: string; username: string; cashoutMultiplier: number; payoutCents: number }) => {
      console.log("Cashed out")
      store().updateCashout({
        playerId: payload.playerId,
        cashoutMultiplier: payload.cashoutMultiplier,
        payoutCents: payload.payoutCents,
      });
    });

    socket.on('round:tick', (payload: { roundId: string; elapsedMs: number }) => {
      const { startedAt } = useGameStore.getState();
      if (startedAt == null) return;
      const clientElapsed = Date.now() - startedAt;
      // Correct clock drift if off by more than 500 ms
      if (Math.abs(payload.elapsedMs - clientElapsed) > 500) {
        useGameStore.setState({ startedAt: Date.now() - payload.elapsedMs });
      }
    });

    return () => {
      socket.off('connect', hydrateFromRest);
      socket.off('reconnect', hydrateFromRest);
      socket.off('round:betting');
      socket.off('round:started');
      socket.off('round:crashed');
      socket.off('round:bet');
      socket.off('round:cashout');
      socket.off('round:tick');
      socket.disconnect();
    };
  }, [store]);
}
