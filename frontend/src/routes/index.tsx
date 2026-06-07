import { createFileRoute } from '@tanstack/react-router';
import { Navbar } from '#/components/layout/Navbar';
import { Panel } from '#/components/ui/Panel';
import { useAuth } from '#/hooks/useAuth';
import { useGameSocket } from '#/hooks/useGameSocket';
import { useRoundHistory } from '#/hooks/useRoundHistory';
import { History } from '#/components/layout/History';
import { CrashChart } from '#/components/game/CrashChart';

export const Route = createFileRoute('/')({ component: CrashGamePage });

function CrashGamePage() {
  const { user, isAuthenticated, login, logout } = useAuth();
  useGameSocket();
  useRoundHistory();

  return (
    <div className="flex flex-col h-screen bg-[#0b1510]">
      <Navbar
        isAuthenticated={isAuthenticated}
        username={user?.profile.preferred_username ?? user?.profile.name}
        onLogin={login}
        onLogout={logout}
      />

      <main
        className="
          flex-1 min-h-0 grid gap-3 p-3 overflow-auto
          grid-cols-1
          md:grid-cols-[1fr_18rem] md:grid-rows-[auto_minmax(0,1fr)_auto]
          lg:grid-cols-[19rem_1fr_21rem] lg:grid-rows-[auto_minmax(0,1fr)]
        "
      >
        {/*History*/}
        <Panel
          className="min-h-12 overflow-hidden
            md:col-start-1 md:row-start-1
            lg:col-start-2 lg:row-start-1"
        >
          <History />
        </Panel>
        {/*Chart*/}
        <Panel
          className="min-h-60
            md:col-start-1 md:row-start-2
            lg:col-start-2 lg:row-start-2 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] bg-[length:24px_24px]"
        >
          <CrashChart />
        </Panel>
        {/*Place Bets*/}
        <Panel
          className=" min-h-72
            md:col-start-1 md:row-start-3
            lg:col-start-1 lg:row-start-1 lg:row-span-2"
        >
        </Panel>
        {/*Bets List*/}
        <Panel
          className="min-h-60
            md:col-start-2 md:row-start-1 md:row-span-3
            lg:col-start-3 lg:row-start-1 lg:row-span-2"
        >
        </Panel>
      </main>
    </div>
  );
}
