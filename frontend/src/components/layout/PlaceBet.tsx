import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Gem } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useGameStore } from "#/store/game";
import { useAuth } from "#/hooks/useAuth";
import { apiFetch } from "#/lib/api";

interface BetResponse {
  betId: string;
  roundId: string;
  amountCents: number;
  status: string;
}

export function PlaceBet() {
  const status = useGameStore((s) => s.status);
  const { user, isAuthenticated } = useAuth();
  const [amount, setAmount] = useState("");

  const amountCents = Math.round(parseFloat(amount) * 100) || 0;
  const isValidAmount = amountCents >= 100 && amountCents <= 100_000;
  const isBettingOpen = status === "betting";
  const canBet = isBettingOpen && isAuthenticated && isValidAmount;

  const bet = useMutation({
    mutationFn: (currentAmountCents: number) =>
      apiFetch<BetResponse>("/games/bets", {
        method: "POST",
        headers: { Authorization: `Bearer ${user!.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: currentAmountCents }),
      }),
  });

  return (
    <div className="overflow-hidden w-full h-full rounded-xl flex flex-col items-start p-4 gap-4">
      <Input
        label="Stake"
        placeholder="100.00"
        icon={Gem}
        disabled={!isBettingOpen || !isAuthenticated}
        type="number"
        min={1}
        step={0.01}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      {isBettingOpen ? (
        <Button
          className="w-full py-3 flex flex-col gap-1"
          disabled={!canBet || bet.isPending}
          onClick={() => bet.mutate(amountCents)}
        >
          <span>{bet.isPending ? "Placing..." : "Place Bet"}</span>
          <text className="font-mono text-lime-800">
            {amountCents > 0 ? (amountCents / 100).toFixed(2) : "0.00"} BRL
          </text>
        </Button>
      ) : (
        <Button variant="ghost" className="w-full py-3 flex flex-col gap-1" disabled>
          <span className="font-medium">Betting closed</span>
          <text className="font-mono font-bold text-lg">Next round soon</text>
        </Button>
      )}

      {bet.isError && (
        <p className="text-loss-500 text-xs font-ui">{(bet.error as Error).message}</p>
      )}
    </div>
  );
}
