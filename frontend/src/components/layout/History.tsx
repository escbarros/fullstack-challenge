import { History as HistoryIcon } from 'lucide-react';
import { PillSkeleton } from '#/components/ui/PillSkeleton';
import { useRoundHistory } from '#/hooks/useRoundHistory';
import { useGameStore } from '#/store/game';
import { CrashpointPill } from '../ui/CrashpointPill';

export function History() {
  const { isLoading } = useRoundHistory();
  const history = useGameStore((s) => s.history);

  return (
    <div className="overflow-hidden w-full h-full rounded-xl flex flex-row items-center px-2 gap-3">
      <HistoryIcon size={16} className="text-fg-3 shrink-0" />

      <div className="flex flex-row items-center gap-1.5 overflow-x-hidden">
        {isLoading
          ? Array.from({ length: 16 }, (_, i) => <PillSkeleton key={i} />)
          : history.map((item) => <CrashpointPill key={item.id} item={item}/>)
        }
      </div>
    </div>
  );
}
