import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { handleCallback } from '#/lib/auth';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback()
      .then(() => router.navigate({ to: '/' }))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      });
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-bg-base text-fg-2 font-ui">
      {error ? (
        <p className="text-loss-500">{error}</p>
      ) : (
        <p>Signing you in…</p>
      )}
    </div>
  );
}
