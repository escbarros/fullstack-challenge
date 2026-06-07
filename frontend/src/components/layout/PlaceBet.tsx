import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Gem } from "lucide-react";

import { useAuth } from "#/hooks/useAuth";
import { apiFetch } from "#/lib/api";
import { useGameStore } from "#/store/game";

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface BetResponse {
  betId: string;
  roundId: string;
  amountCents: number;
  status: string;
}

export function PlaceBet() {
  const { user, isAuthenticated } = useAuth();

  const status = useGameStore((s) => s.status);
  const roundId = useGameStore((s) => s.roundId);
  const bets = useGameStore((s) => s.bets);
  const multiplier = useGameStore((s) => s.multiplier);

  const [amount, setAmount] = useState("");

  const amountCents = Math.round(parseFloat(amount) * 100) || 0;

  const isBettingOpen = status === "betting";
  const isRoundActive = status === "active";
  const isValidAmount = amountCents >= 100 && amountCents <= 100_000;

  const userBet = bets.find((bet) => bet.username === user?.profile.preferred_username);

  const hasBet = Boolean(userBet);
  const isCashedOut = userBet?.status === "cashedout";

  const canBet =
    isBettingOpen &&
    isAuthenticated &&
    isValidAmount &&
    !hasBet;

  const canCashout =
    isRoundActive &&
    hasBet &&
    !isCashedOut;

  const currentWinCents = userBet
    ? Math.floor(userBet.amountCents * multiplier)
    : 0;

  const authHeaders = {
    Authorization: `Bearer ${user?.access_token}`,
  };

  const bet = useMutation({
    mutationFn: (amountCents: number) =>
      apiFetch<BetResponse>("/games/bets", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amountCents }),
      }),
  });

  const cashout = useMutation({
    mutationFn: () =>
      apiFetch(`/games/bets/${roundId}/cashout`, {
        method: "POST",
        headers: authHeaders,
      }),
  });

  useEffect(() => {
    bet.reset();
    cashout.reset();
  }, [roundId]);

  const renderActionButton = () => {
    if (isBettingOpen) {
      if (hasBet || bet.isSuccess) {
        return (
          <Button className="w-full py-3 flex flex-col gap-1" disabled>
            <span className="font-medium">Bet placed</span>
            <span className="font-mono text-sm opacity-80">
              Waiting for round to start
            </span>
          </Button>
        );
      }

      return (
        <Button
          className="w-full py-3 flex flex-col gap-1"
          disabled={!canBet || bet.isPending}
          onClick={() => bet.mutate(amountCents)}
        >
          <span>
            {bet.isPending ? "Placing..." : "Place Bet"}
          </span>

          <span className="font-mono text-lime-800">
            {amountCents > 0
              ? (amountCents / 100).toFixed(2)
              : "0.00"}{" "}
            BRL
          </span>
        </Button>
      );
    }

    if (isRoundActive && hasBet) {
      if (isCashedOut || cashout.isSuccess) {
        return (
          <Button className="w-full py-3 flex flex-col gap-1" disabled>
            <span className="font-medium">Cashed out</span>
            <span className="font-mono text-sm opacity-80">
              Waiting for next round
            </span>
          </Button>
        );
      }

      return (
        <Button
          className="w-full py-3 flex flex-col gap-1 bg-amber-500 hover:bg-amber-600 text-white"
          disabled={!canCashout || cashout.isPending}
          onClick={() => cashout.mutate()}
        >
          <span>
            {cashout.isPending
              ? "Cashing out..."
              : "Cashout"}
          </span>

          <span className="font-mono font-bold">
            {(currentWinCents / 100).toFixed(2)} BRL
          </span>
        </Button>
      );
    }

    return (
      <Button
        variant="ghost"
        className="w-full py-3 flex flex-col gap-1"
        disabled
      >
        <span className="font-medium">Betting closed</span>
        <span className="font-mono font-bold text-lg">
          Next round soon
        </span>
      </Button>
    );
  };

  return (
    <div className="overflow-hidden w-full h-full rounded-xl flex flex-col items-start p-4 gap-4">
      <Input
        label="Stake"
        placeholder="100.00"
        icon={Gem}
        type="number"
        min={1}
        step={0.01}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={
          !isBettingOpen ||
          !isAuthenticated ||
          hasBet ||
          bet.isSuccess
        }
      />

      {renderActionButton()}

      {bet.isError && (
        <p className="text-loss-500 text-xs font-ui">
          {(bet.error as Error).message}
        </p>
      )}

      {cashout.isError && (
        <p className="text-loss-500 text-xs font-ui">
          {(cashout.error as Error).message}
        </p>
      )}
    </div>
  );
}
