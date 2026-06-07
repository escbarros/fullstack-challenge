import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { elapsedForMultiplier, multiplierAt } from '#/lib/multiplier';

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

export function CrashChartSkeleton() {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();

  // Hardcoded target value to match the skeleton preview
  const value = 1.22;

  const geom = useMemo(() => {
    const plotW = Math.max(width - PAD.left - PAD.right, 1);
    const plotH = Math.max(height - PAD.top - PAD.bottom, 1);

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
  }, [width, height]);

  return (
    <div ref={ref} className="relative w-full h-full overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full"
        width={width}
        height={height}
        role="img"
        aria-label="Loading crash chart"
      >
        <defs>
          <linearGradient id="skeleton-shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--surface-2)" />
            <stop offset="50%" stopColor="var(--surface-elev)" />
            <stop offset="100%" stopColor="var(--surface-2)" />
            <animate attributeName="x1" values="-100%; 100%" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="x2" values="0%; 200%" dur="1.4s" repeatCount="indefinite" />
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

        <line
          x1={geom.endX}
          y1={PAD.top}
          x2={geom.endX}
          y2={geom.baseY}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />

        {geom.area && <path d={geom.area} fill="url(#skeleton-shimmer)" />}

        {geom.line && (
          <path
            d={geom.line}
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <circle
          cx={geom.endX}
          cy={geom.endY}
          r={5}
          fill="var(--surface-elev)"
        />
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
    </div>
  );
}
