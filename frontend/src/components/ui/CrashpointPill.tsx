import { type ButtonHTMLAttributes, useState } from "react";
import { cn } from "#/lib/cn";
import type { HistoryItem } from "#/store/game"
import { cva } from "class-variance-authority";
import { RoundDetailsModal, type RoundVerificationData } from "../layout/RoundDetailsModal";
import { apiFetch } from "#/lib/api";

const pillVariants = cva(
  "text-[10px] border font-mono font-bold px-2.5 py-1 rounded-full shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        low: "border-danger text-danger bg-danger/10",
        medium: "border-lime text-lime bg-lime/10",
        high: "border-gold text-gold bg-gold/10",
        ultra: "border-magenta text-magenta bg-magenta/10",
      },
    },
    defaultVariants: {
      variant: "low",
    },
  }
);

interface CrashpointPillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  item: HistoryItem
}
export function CrashpointPill({ item, className, ...props }: CrashpointPillProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<RoundVerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  let variant: "low" | "medium" | "high" | "ultra";

  if (item.crashPoint < 2) {
    variant = "low";
  } else if (item.crashPoint < 10) {
    variant = "medium";
  } else if (item.crashPoint < 20) {
    variant = "high";
  } else {
    variant = "ultra";
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (props.onClick) props.onClick(e);
    setIsModalOpen(true);
    if (!modalData && !isLoading) {
      setIsLoading(true);
      try {
        const data = await apiFetch<RoundVerificationData>(`/games/rounds/${item.id}/verify`);
        setModalData(data);
      } catch (err) {
        console.error("Failed to fetch round verification data", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        key={item.id}
        className={cn(pillVariants({ variant }), className)}
        onClick={handleClick}
        {...props}
      >
        {item.crashPoint.toFixed(2)}×
      </button>

      <RoundDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={modalData}
        isLoading={isLoading}
      />
    </>
  )
}
