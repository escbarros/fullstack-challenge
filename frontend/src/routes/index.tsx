import { createFileRoute } from '@tanstack/react-router';
import { Navbar } from '#/components/layout/Navbar';
import { useAuth } from '#/hooks/useAuth';

export const Route = createFileRoute('/')({ component: CrashGamePage });

function CrashGamePage() {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-[#0b1510] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] bg-[length:24px_24px]">
      <Navbar
        isAuthenticated={isAuthenticated}
        username={user?.profile.preferred_username ?? user?.profile.name}
        onLogin={login}
        onLogout={logout}
      />
    </div>
  );
}
