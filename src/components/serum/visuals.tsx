import type { Env, Osc } from "@/lib/serum/types";
import { hash } from "@/lib/serum/util";

export function OscScope({ osc }: { osc: Osc }) {
  const h = hash(osc.wavetable);
  const pos = osc.wtPos / 100;
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const x = (i / 120) * Math.PI * 2;
    let y = Math.sin(x);
    for (let k = 2; k <= 6; k++) {
      const w = (((h >> k) & 7) / 7) * pos;
      y += (w / k) * Math.sin(k * x + (h % 5));
    }
    pts.push(`${(i / 120) * 200},${30 - y * 16}`);
  }
  return (
    <svg viewBox="0 0 200 60" className="h-14 w-full rounded-md bg-background/60" aria-hidden>
      <line x1="0" y1="30" x2="200" y2="30" className="stroke-border" strokeWidth="0.5" />
      <polyline points={pts.join(" ")} fill="none" className={osc.enabled ? "stroke-accent" : "stroke-muted-foreground"} strokeWidth="1.5" />
    </svg>
  );
}

export function AdsrGraph({ env }: { env: Env }) {
  const total = env.attack + env.hold + env.decay + 600 + env.release || 1;
  const sx = (ms: number) => (ms / total) * 200;
  const a = sx(env.attack), hd = a + sx(env.hold), d = hd + sx(env.decay), s = d + sx(600), r = s + sx(env.release);
  const sy = 55 - (env.sustain / 100) * 50;
  const path = `M0,55 L${a},5 L${hd},5 L${d},${sy} L${s},${sy} L${r},55`;
  return (
    <svg viewBox="0 0 200 60" className="h-16 w-full rounded-md bg-background/60" aria-hidden>
      <path d={`${path} Z`} className="fill-primary/15" />
      <path d={path} fill="none" className="stroke-primary" strokeWidth="1.5" />
    </svg>
  );
}

export function WaveMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M2 16 C6 4, 10 4, 12 16 S18 28, 22 16 S27 8, 30 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}