import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

let userManager: UserManager | null = null;


export function getUserManager(): UserManager | null {
  if (typeof window === 'undefined') return null;
  if (userManager) return userManager;

  const authority = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}`;

  userManager = new UserManager({
    authority,
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email',
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    automaticSilentRenew: true,
  });

  return userManager;
}

export async function login(): Promise<void> {
  const manager = getUserManager();
  if (!manager) return;
  await manager.signinRedirect();
}

export async function handleCallback(): Promise<User | null> {
  const manager = getUserManager();
  if (!manager) return null;
  return manager.signinRedirectCallback();
}

export async function logout(): Promise<void> {
  const manager = getUserManager();
  if (!manager) return;
  await manager.signoutRedirect();
}

export async function getUser(): Promise<User | null> {
  const manager = getUserManager();
  if (!manager) return null;
  return manager.getUser();
}
