import { create } from 'zustand';

export type RoundStatus = 'idle' | 'betting' | 'active' | 'crashed';

export interface HistoryItem {
  id: string;
  crashPoint: number;
  seedHash: string;
}

export interface Bet {
  betId: string;
  playerId: string;
  username: string;
  amountCents: number;
  status: 'pending' | 'confirmed' | 'cashedout' | 'lost' | 'cancelled';
  cashoutMultiplier: number | null;
  payoutCents: number | null;
}

export interface WalletInfo {
  id: string;
  playerId: string;
  balanceCents: string;
}

export interface GameState {
  // Wallet
  wallet: WalletInfo | null;
  setWallet: (wallet: WalletInfo) => void;
  clearWallet: () => void;

  // Round
  roundId: string | null;
  status: RoundStatus;
  seedHash: string | null;
  bettingEndsAt: number | null;  // epoch ms
  startedAt: number | null;      // epoch ms — drives client-side multiplier calc
  crashPoint: number | null;     // revealed only after crash
  multiplier: number;            // live value, updated by rAF loop

  // Bets
  bets: Bet[];
  ownBet: Bet | null;

  // History (last 16 crashed rounds, newest first)
  history: HistoryItem[];

  // Actions — round lifecycle
  setRoundBetting: (payload: { roundId: string; seedHash: string; bettingEndsAt: string }) => void;
  setRoundStarted: (payload: { roundId: string; startedAt: string }) => void;
  setRoundCrashed: (payload: { roundId: string; crashPoint: number; serverSeed: string; clientSeed: string; seedHash: string }) => void;
  setMultiplier: (value: number) => void;

  // Actions — bets
  addBet: (bet: Omit<Bet, 'cashoutMultiplier' | 'payoutCents'> & { cashoutMultiplier?: number | null; payoutCents?: number | null }) => void;
  updateCashout: (payload: { playerId: string; cashoutMultiplier: number; payoutCents: number }) => void;

  // Actions — history
  setHistory: (items: HistoryItem[]) => void;
  prependHistory: (item: HistoryItem) => void;
}

const HISTORY_LIMIT = 20;

const initialRoundState = {
  roundId: null,
  status: 'idle' as RoundStatus,
  seedHash: null,
  bettingEndsAt: null,
  startedAt: null,
  crashPoint: null,
  multiplier: 1,
  bets: [],
  ownBet: null,
};

export const useGameStore = create<GameState>((set) => ({
  wallet: null,
  setWallet: (wallet) => set({ wallet }),
  clearWallet: () => set({ wallet: null }),

  ...initialRoundState,
  history: [],

  setRoundBetting: ({ roundId, seedHash, bettingEndsAt }) =>
    set((s) => ({
      ...initialRoundState,
      history: s.history,
      roundId,
      status: 'betting',
      seedHash,
      bettingEndsAt: new Date(bettingEndsAt).getTime(),
    })),

  setRoundStarted: ({ roundId, startedAt }) =>
    set({ roundId, status: 'active', startedAt: new Date(startedAt).getTime(), multiplier: 1 }),

  setRoundCrashed: ({ roundId, crashPoint, seedHash }) =>
    set({ roundId, status: 'crashed', crashPoint, multiplier: crashPoint, seedHash }),

  setMultiplier: (value) => set({ multiplier: value }),

  addBet: (bet) =>
    set((s) => ({
      bets: [...s.bets, { cashoutMultiplier: null, payoutCents: null, ...bet }],

      wallet: s.wallet
        ? {
            ...s.wallet,
            balanceCents: (
              BigInt(s.wallet.balanceCents) - BigInt(bet.amountCents)
            ).toString(),
          }
        : null,
    })),

    updateCashout: ({ playerId, cashoutMultiplier, payoutCents }) =>
      set((s) => ({
        bets: s.bets.map((b) =>
          b.playerId === playerId
            ? {
                ...b,
                status: 'cashedout' as const,
                cashoutMultiplier,
                payoutCents,
              }
            : b,
        ),

        ownBet:
          s.ownBet?.playerId === playerId
            ? {
                ...s.ownBet,
                status: 'cashedout' as const,
                cashoutMultiplier,
                payoutCents,
              }
            : s.ownBet,

        wallet:
          s.ownBet?.playerId === playerId && s.wallet
            ? {
                ...s.wallet,
                balanceCents: (
                  BigInt(s.wallet.balanceCents) + BigInt(payoutCents)
                ).toString(),
              }
            : s.wallet,
      })),

  setHistory: (items) => set({ history: items }),

  prependHistory: (item) =>
    set((s) => ({ history: [item, ...s.history].slice(0, HISTORY_LIMIT) })),
}));
