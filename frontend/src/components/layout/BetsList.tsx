export function BetsList() {
  return (
    <div className="overflow-hidden w-full h-full rounded-xl flex flex-col items-start p-4 gap-4">
      <div className="grid grid-cols-[4fr_1fr_1fr_2fr_auto] items-center gap-4 text-fg-2">
        <div>Player</div>
        <div className="text-center">Bet</div>
        <div className="text-center">Mult</div>
        <div className="text-center">Payout</div>
        <div />
      </div>
      <div className="divide-y divide-zinc-800">
          <div
            className="grid grid-cols-[1fr_80px_80px_100px_32px] items-center gap-4 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full bg-red-200"/>
              <span className="truncate">Name</span>
            </div>

            <div className="text-center">A</div>
            <div className="text-center">M</div>
            <div className="text-center">Payout</div>

            <button className="justify-self-end">⋯</button>
          </div>

      </div>
    </div>
  )
}
