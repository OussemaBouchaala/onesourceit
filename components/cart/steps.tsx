import { cn } from "@/lib/utils";

const STEPS = ["Panier", "Livraison", "Confirmation"];

export function Steps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol aria-label="Étapes de la commande" className="m-0 flex list-none gap-2 p-0 text-sm">
      {STEPS.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5",
            i === current ? "bg-white font-semibold text-navy" : i < current ? "bg-card text-ink" : "bg-card text-muted",
          )}
        >
          <span aria-hidden className="font-display">{i + 1}</span>
          <span className={cn(i !== current && "max-sm:sr-only")}>{s}</span>
        </li>
      ))}
    </ol>
  );
}
