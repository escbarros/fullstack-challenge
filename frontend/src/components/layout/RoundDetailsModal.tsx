import { X, Loader2, ShieldCheck, Check, type LucideIcon, Copy } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface RoundVerificationData {
  roundId: string;
  crashPoint: string | number;
  seedHash: string;
  serverSeed: string;
  clientSeed: string;
  verification?: any;
}

export interface RoundDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RoundVerificationData | null;
  isLoading?: boolean;
}

interface DetailItemProps {
  title: string;
  value: ReactNode;
  variant?: "cyan" | "lime";
  icon?: LucideIcon;
  showCopyButton?: boolean;
}

function DetailItem({ title, value, variant = "cyan", icon: Icon, showCopyButton = true }: DetailItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-1/2 bg-bg-canvas rounded-md p-2 flex flex-col items-start gap-1.5 overflow-hidden">
      {showCopyButton && (
        <button
          type="button"
          onClick={handleCopy}
          className="cursor-pointer absolute right-2 top-2 text-fg-3 hover:text-fg-1 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check size={10} className="text-lime-500" /> : <Copy size={10}/>}
        </button>
      )}
      <span className="select-none font-ui text-fg-3 font-semibold text-xs truncate w-full">{title}</span>
      <span
        className={cn(
          "font-mono font-light text-xs flex items-center gap-1 truncate w-full",
          variant === "cyan" ? "text-cyan-400" : "text-lime font-semibold"
        )}
      >
        <span className="truncate">{value}</span>
        {Icon && <Icon size={10} className="shrink-0" />}
      </span>
    </div>
  );
}

export function RoundDetailsModal({ isOpen, onClose, data, isLoading }: RoundDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-elev border border-border w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 pb-0">
          <div className="flex items-center gap-1">
            <ShieldCheck size={16} className="text-cyan-600"/><span className="text-base font-semibold"> Provably Fair</span>
          </div>
          <IconButton variant="ghost" icon={X} size={12} onClick={onClose} aria-label="Close modal">
          </IconButton>
        </div>
        <span className="px-4 py-4 text-xs text-fg-2 block">Every round's crash point is committed <span className="font-semibold text-lime">before</span> bets open. We publish the hashed server seed up front. Verify any outcome yourself, anytime.</span>
        <div className="p-4 pt-0 flex flex-col gap-3">
          {isLoading || !data ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-lime-500" />
            </div>
          ) : (
              <>
                <div className="w-full flex flex-row gap-2">
                  <DetailItem title="Seed Hash" value={data.seedHash} />
                  <DetailItem title="Server Seed" value={data.serverSeed} />
                </div>
                <div className="w-full flex flex-row gap-2">
                  <DetailItem title="Client Seed" value={data.clientSeed} />
                  <DetailItem
                    showCopyButton={false}
                    title="Result"
                    value={`${data.crashPoint}×`}
                    variant="lime"
                    icon={Check}
                  />
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
