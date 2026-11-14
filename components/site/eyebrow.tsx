import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "eyebrow m-0 flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.14em] text-muted uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}
