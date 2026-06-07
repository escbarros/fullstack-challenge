import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMultiplierEngine } from '#/hooks/useMultiplierEngine';
import { elapsedForMultiplier, multiplierAt } from '#/lib/multiplier';
import { useGameStore, type RoundStatus } from '#/store/game';

const HEADROOM = 1.4;
const SAMPLES = 64;
const PAD = { top: 16, right: 52, bottom: 26, left: 6 };
const X_CURVE = 0.55;

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
}

function useBettingCountdown(): number {
  const bettingEndsAt = useGameStore((s) => s.bettingEndsAt);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (bettingEndsAt == null) return;
    const tick = () => setRemaining(Math.max(0, bettingEndsAt - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [bettingEndsAt]);

  return remaining;
}

const CRASH_DISPLAY_MS = 3000;

function useDisplayStatus(): RoundStatus {
  const storeStatus = useGameStore((s) => s.status);
  const [displayStatus, setDisplayStatus] = useState<RoundStatus>(storeStatus);
  const crashedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (storeStatus === 'crashed') {
      crashedAtRef.current = Date.now();
      setDisplayStatus('crashed');
      return;
    }

    if (storeStatus === 'betting' && displayStatus === 'crashed' && crashedAtRef.current != null) {
      const elapsed = Date.now() - crashedAtRef.current;
      const remaining = Math.max(0, CRASH_DISPLAY_MS - elapsed);
      if (remaining === 0) {
        setDisplayStatus('betting');
        return;
      }
      const id = setTimeout(() => {
        crashedAtRef.current = null;
        setDisplayStatus('betting');
      }, remaining);
      return () => clearTimeout(id);
    }

    setDisplayStatus(storeStatus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeStatus]);

  return displayStatus;
}

const IDLE_TICKS = [2.0, 1.5, 1.0];

export function CrashChart() {
  useMultiplierEngine();

  const status = useDisplayStatus();
  const multiplier = useGameStore((s) => s.multiplier);
  const storeCrashPoint = useGameStore((s) => s.crashPoint);
  const bettingCountdown = useBettingCountdown();

  // Persist the last known crash point so it remains available during the 3s
  // crashed display window, even after the store has already reset to betting.
  const [lastCrashPoint, setLastCrashPoint] = useState<number | null>(null);
  useEffect(() => {
    if (storeCrashPoint != null) setLastCrashPoint(storeCrashPoint);
  }, [storeCrashPoint]);

  const crashPoint = lastCrashPoint;

  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  const crashed = status === 'crashed';
  const live = status === 'active' || crashed;
  const isBetting = status === 'betting';

  const [shaking, setShaking] = useState(false);
  useEffect(() => {
    if (!crashed) return;
    setShaking(true);
    const id = setTimeout(() => setShaking(false), 600);
    return () => clearTimeout(id);
  }, [crashed]);

  const value = live ? Math.max(multiplier, 1) : 1;

  const geom = useMemo(() => {
    const plotW = Math.max(width - PAD.left - PAD.right, 1);
    const plotH = Math.max(height - PAD.top - PAD.bottom, 1);

    if (isBetting || crashed || status === 'idle') {
      const yMax = IDLE_TICKS[0];
      const toY = (m: number) => PAD.top + (1 - (m - 1) / (yMax - 1)) * plotH;
      const ticks = IDLE_TICKS.map((m) => ({ m, y: toY(m) }));
      return { line: null, area: null, endX: 0, endY: 0, baseY: 0, ticks };
    }

    const yMax = 1 + Math.max(value - 1, 0.2) * HEADROOM;
    const toY = (m: number) => PAD.top + (1 - (m - 1) / (yMax - 1)) * plotH;
    const baseY = toY(1);

    const toX = (linearFrac: number) =>
      PAD.left + linearFrac ** X_CURVE * plotW;

    const tMax = elapsedForMultiplier(Math.max(value, 1.0001));
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const frac = i / SAMPLES;
      const m = value <= 1.0001 ? 1 : multiplierAt(tMax * frac);
      pts.push([toX(frac), toY(m)]);
    }

    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const [endX, endY] = pts[pts.length - 1];
    const area = `${line} L${endX.toFixed(2)} ${baseY.toFixed(2)} L${pts[0][0].toFixed(2)} ${baseY.toFixed(2)} Z`;

    const ticks = [yMax, (1 + yMax) / 2, 1].map((m) => ({ m, y: toY(m) }));

    return { line, area, endX, endY, baseY, ticks };
  }, [width, height, value, isBetting, status]);

  const stroke = crashed ? 'var(--loss-500)' : 'var(--lime-500)';
  const fillId = crashed ? 'crash-area-loss' : 'crash-area-lime';

  const countdownSec = (bettingCountdown / 1000).toFixed(1);

  return (
    <div ref={ref} className={`relative w-full h-full overflow-hidden${shaking ? ' crash-shake' : ''}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        width={width}
        height={height}
        role="img"
        aria-label="Live crash multiplier curve"
      >
        <title>Live crash multiplier curve</title>
        <defs>
          <linearGradient id="crash-area-lime" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--lime-500)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--lime-500)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="crash-area-loss" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--loss-500)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="var(--loss-500)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {geom.ticks.map((t) => (
          <line
            key={t.m}
            x1={PAD.left}
            y1={t.y}
            x2={width - PAD.right}
            y2={t.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}

        {live && (
          <line
            x1={geom.endX}
            y1={PAD.top}
            x2={geom.endX}
            y2={geom.baseY}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        )}

        {geom.area && <path d={geom.area} fill={`url(#${fillId})`} />}

        {geom.line && (
          <path
            d={geom.line}
            fill="none"
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: crashed
                ? 'drop-shadow(0 0 8px rgba(255,77,77,0.75))'
                : 'drop-shadow(0 0 7px rgba(184,255,60,0.7))',
            }}
          />
        )}

        {live && (
          <circle
            cx={geom.endX}
            cy={geom.endY}
            r={5}
            fill={crashed ? 'var(--loss-500)' : 'var(--lime-300)'}
            style={{
              filter: crashed
                ? 'drop-shadow(0 0 6px rgba(255,77,77,0.9))'
                : 'drop-shadow(0 0 7px rgba(184,255,60,0.95))',
            }}
          />
        )}
      </svg>

      {geom.ticks.map((t) => (
        <span
          key={t.m}
          className="jg-num pointer-events-none absolute text-[11px] text-fg-3"
          style={{ right: 10, top: t.y, transform: 'translateY(-50%)' }}
        >
          {t.m.toFixed(2)}×
        </span>
      ))}

      {isBetting && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span
            className="jg-eyebrow text-lime"
            style={{ letterSpacing: '0.14em' }}
          >
            Next round in
          </span>
          <span
            className="jg-num tabular-nums"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(52px, 10vw, 88px)',
              lineHeight: 1,
              color: 'var(--fg-1)',
            }}
          >
            {countdownSec}s
          </span>
          <span className="text-fg-2 text-[15px] mt-1" style={{ fontFamily: 'var(--font-ui)' }}>
            Place your bet
          </span>
        </div>
      )}

      {!isBetting && crashed && crashPoint != null && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="jg-multiplier flex items-baseline tabular-nums"
            style={{ color: 'var(--loss-500)', textShadow: 'var(--glow-loss)' }}
          >
            {crashPoint.toFixed(2)}
            <span className="ml-1 text-[0.38em] font-semibold opacity-70">×</span>
          </span>

            <span
              className="jg-num mt-2 text-[14px]"
              style={{ color: 'var(--loss-500)', fontFamily: 'var(--font-mono)' }}
            >
              Busted @ {crashPoint.toFixed(2)}×
            </span>
        </div>
      ) }

      {!isBetting && !crashed &&(
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="jg-multiplier flex items-baseline tabular-nums"
            style={crashed ? { color: 'var(--loss-500)', textShadow: 'var(--glow-loss)' } : undefined}
          >
            {value.toFixed(2)}
            <span className="ml-1 text-[0.38em] font-semibold opacity-70">×</span>
          </span>
        </div>
      )}
    </div>
  );
}
