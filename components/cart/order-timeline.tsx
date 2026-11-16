import { Check } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Status = "new" | "confirmed" | "ready" | "shipped" | "delivered" | "settled" | "returned" | "cancelled";

/** Customer-facing progress: Reçue → Confirmée → En route / Prête → Livrée. */
export function OrderTimeline({
  status,
  history,
  pickup,
  courierName,
  trackingNumber,
}: {
  status: Status;
  history: { status: Status; at: number }[];
  pickup: boolean;
  courierName: string | null;
  trackingNumber: string | null;
}) {
  if (status === "cancelled" || status === "returned") {
    return (
      <p role="status" className="m-0 w-full rounded-[14px] bg-bad-soft p-4 text-bad-ink">
        {status === "cancelled" ? "Cette commande a été annulée." : "Ce colis nous a été retourné."} Une question ? Écrivez-nous sur WhatsApp.
      </p>
    );
  }
  const steps: { label: string; reached: Status[] }[] = pickup
    ? [
        { label: "Reçue", reached: ["new", "confirmed", "ready", "settled"] },
        { label: "Confirmée", reached: ["confirmed", "ready", "settled"] },
        { label: "Prête au retrait", reached: ["ready", "settled"] },
        { label: "Retirée", reached: ["settled"] },
      ]
    : [
        { label: "Reçue", reached: ["new", "confirmed", "shipped", "delivered", "settled"] },
        { label: "Confirmée", reached: ["confirmed", "shipped", "delivered", "settled"] },
        { label: "En route", reached: ["shipped", "delivered", "settled"] },
        { label: "Livrée", reached: ["delivered", "settled"] },
      ];
  // Date of the first status that reached each step.
  const when = (reached: Status[]) => history.find((h) => h.status === reached[0])?.at;
  return (
    <ol aria-label="Suivi de la commande" className="m-0 flex w-full list-none flex-col gap-0 p-0">
      {steps.map((s, i) => {
        const done = s.reached.includes(status);
        const at = done ? when(s.reached) : undefined;
        return (
          <li key={s.label} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 flex-none items-center justify-center rounded-full border-2",
                  done ? "border-ok bg-ok text-white" : "border-line-strong",
                )}
              >
                {done && <Check className="size-4" strokeWidth={3} />}
              </span>
              {i < steps.length - 1 && <span aria-hidden className={cn("w-0.5 flex-1 min-h-5", done ? "bg-ok" : "bg-line-strong")} />}
            </span>
            <span className="flex flex-col pb-4">
              <strong className={done ? "" : "text-muted"}>
                {s.label}
                <span className="sr-only">{done ? " : fait" : " : à venir"}</span>
              </strong>
              {at && <span className="text-sm text-muted">{formatDate(at)}</span>}
              {s.label === "En route" && done && courierName && (
                <span className="text-sm text-muted">
                  {courierName}
                  {trackingNumber ? ` · suivi ${trackingNumber}` : ""}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
