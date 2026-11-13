import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Field =
  | { kind: "range"; path: string; label: string; min: number; max: number; step?: number; unit?: string }
  | { kind: "select"; path: string; label: string; options: readonly string[] }
  | { kind: "toggle"; path: string; label: string };

export function RangeParam({ label, value, min, max, step = 1, unit, disabled, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; disabled?: boolean; onChange: (v: number) => void;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
        <input
          type="number" aria-label={`${label} value`} value={value} min={min} max={max} step={step} disabled={disabled}
          onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }}
          className="w-16 bg-transparent text-right font-mono text-xs text-foreground focus:text-accent focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1">
        <input id={id} type="range" className="param-range" style={{ ["--fill" as string]: `${fill}%` }}
          min={min} max={max} step={step} value={value} disabled={disabled}
          aria-valuetext={`${value}${unit ? " " + unit : ""}`}
          onChange={(e) => onChange(Number(e.target.value))} />
        {unit && <span className="w-6 font-mono text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function SelectParam({ label, value, options, disabled, onChange }: {
  label: string; value: string; options: readonly string[]; disabled?: boolean; onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-secondary px-2 py-1.5 text-sm text-foreground disabled:opacity-40">
        {!options.includes(value) && <option value={value}>{value}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full border border-input transition-colors", checked ? "bg-accent" : "bg-secondary")}>
      <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-foreground transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

export function Panel({ title, accent, right, children, className }: {
  title: string; accent?: "primary" | "accent"; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section aria-label={title} className={cn("rounded-xl border border-border bg-panel p-4", className)}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-xs font-medium tracking-[0.18em] text-foreground">
          <span className={cn("h-1.5 w-1.5 rounded-full", accent === "accent" ? "bg-accent" : "bg-primary")} />
          {title}
        </h3>
        {right}
      </header>
      {children}
    </section>
  );
}