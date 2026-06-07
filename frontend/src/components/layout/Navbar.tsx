import { LogIn, LogOut } from "lucide-react";
import { Button } from "#/components/ui/Button";
import { IconButton } from "#/components/ui/IconButton";
import { Avatar } from "#/components/ui/Avatar";
import { BalancePill } from "#/components/ui/BalancePill";

interface NavbarProps {
  isAuthenticated?: boolean;
  username?: string;
  balance?: string;
  onLogin?: () => void;
  onLogout?: () => void;
}

export function Navbar({ isAuthenticated, username, balance = "0,000.00", onLogin, onLogout }: NavbarProps) {
  return (
    <header className="flex items-center justify-between px-6 h-14 nav-background">
      <img
        src="/assets/images/logo.svg"
        alt="Jungle Crash"
        className="h-10 w-auto"
      />
      {isAuthenticated ? (
        <div className="flex items-center gap-4">
          <BalancePill value={balance} />
          <Avatar seed={username} />
          <IconButton icon={LogOut} className="size-6" variant="danger" onClick={onLogout} />
        </div>
      ) : (
        <Button variant="primary" onClick={onLogin} className="flex gap-1">
          Login
          <LogIn size={14} />
        </Button>
      )}
    </header>
  );
}
