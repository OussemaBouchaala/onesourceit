export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {/* On phones the page name is already in the top bar. */}
        <h1 className="m-0 font-display text-[clamp(26px,6vw,36px)] font-bold max-md:sr-only">{title}</h1>
        {subtitle && <p className="m-0 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Pill({ on, ...props }: React.ComponentProps<"button"> & { on: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={
        "min-h-11 rounded-full border-[1.5px] px-3.5 py-2 text-sm font-medium " +
        (on ? "border-white bg-white text-navy" : "border-line-strong bg-card text-ink")
      }
      {...props}
    />
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-[18px] py-4">
      <span className="text-[13px] text-muted">{label}</span>
      <strong className="font-display text-[28px]">{value}</strong>
    </div>
  );
}

/** A row of filter pills: wraps on large screens, scrolls sideways on phones. */
export function PillRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={
        "-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:flex-none " +
        (className ?? "")
      }
      {...props}
    />
  );
}
