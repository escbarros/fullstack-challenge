import { Button } from "./Button";

interface NavbarProps {
  isAuthenticated?: boolean;
  username?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

export function Navbar({ isAuthenticated, username, onLogin, onLogout }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-6 h-14 bg-bg-base border-b border-border shrink-0">

      <img
        src="/assets/images/logo.svg"
        alt="Jungle Crash"
        className="h-12 w-auto"
      />

      {isAuthenticated ? (
        <div className="flex items-center gap-4">
          {username && (
            <span className="text-fg-2 text-sm font-ui">{username}</span>
          )}
          <Button variant="danger" onClick={onLogout}>
            Logout
          </Button>
        </div>
      ) : (
        <Button variant="primary" onClick={onLogin}>
          Login
        </Button>
      )}
    </header>
  );
}
