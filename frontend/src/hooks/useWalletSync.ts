import { useEffect, useRef } from 'react';
import type { User } from 'oidc-client-ts';
import { apiFetch } from '#/lib/api';
import { useGameStore, type WalletInfo } from '#/store/game';

export function useWalletSync(user: User | null): void {
  const setWallet = useGameStore((s) => s.setWallet);
  const clearWallet = useGameStore((s) => s.clearWallet);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || user.expired) {
      syncedUserIdRef.current = null;
      clearWallet();
      return;
    }

    const userId = user.profile.sub;
    if (syncedUserIdRef.current === userId) return;
    syncedUserIdRef.current = userId;

    const headers = { Authorization: `Bearer ${user.access_token}` };
    apiFetch<WalletInfo>('/wallets', { method: 'POST', headers })
      .then(() => apiFetch<WalletInfo>('/wallets/me', { headers }))
      .then((wallet) => {
        setWallet(wallet);
      })
      .catch(console.error);
  }, [user, setWallet, clearWallet]);
}
