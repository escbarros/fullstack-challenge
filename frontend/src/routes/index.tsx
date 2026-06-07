import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({ component: CrashGamePage });

function CrashGamePage() {
  return (
    <div className="h-screen w-screen bg-[#0b1510] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] bg-[length:24px_24px]" />
  );
}
