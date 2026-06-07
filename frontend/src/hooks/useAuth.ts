import { useEffect, useState } from 'react';
import type { User } from 'oidc-client-ts';
import { getUser, getUserManager, login, logout } from '#/lib/auth';

interface UseAuth {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const manager = getUserManager();
    if (!manager) {
      setIsLoading(false);
      return;
    }

    let active = true;

    getUser()
      .then((u) => active && setUser(u))
      .finally(() => active && setIsLoading(false));

    const onLoaded = (u: User) => setUser(u);
    const onUnloaded = () => setUser(null);

    manager.events.addUserLoaded(onLoaded);
    manager.events.addUserUnloaded(onUnloaded);
    manager.events.addUserSignedOut(onUnloaded);

    return () => {
      active = false;
      manager.events.removeUserLoaded(onLoaded);
      manager.events.removeUserUnloaded(onUnloaded);
      manager.events.removeUserSignedOut(onUnloaded);
    };
  }, []);

  return {
    user,
    isAuthenticated: user != null && !user.expired,
    isLoading,
    login: () => void login(),
    logout: () => void logout(),
  };
}
