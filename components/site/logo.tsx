import { cn } from "@/lib/utils";

/**
 * Text logo "ONEsource.IT" in Poppins: ONE, the dot and a bold T in red,
 * "source" and "I" in white, inside an open white frame (full top and left
 * lines, short bottom-left line, small tick top right).
 */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center py-2.5 pr-4 pl-3.5 font-display leading-none",
        className,
      )}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-white" />
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-white" />
      <span aria-hidden className="absolute bottom-0 left-0 h-0.5 w-[34%] bg-white" />
      <span aria-hidden className="absolute top-0 right-0 h-[9px] w-0.5 bg-white" />
      <span
        aria-hidden
        className={cn(
          "font-normal tracking-[-0.01em] whitespace-nowrap text-white",
          size === "md" ? "text-[clamp(20px,5.4vw,26px)]" : "text-[22px]",
        )}
      >
        <span className="text-brand">ONE</span>source
        <span className="font-extrabold text-brand">.</span>I
        <span className="font-extrabold text-brand">T</span>
      </span>
      <span className="sr-only">ONEsource IT</span>
    </span>
  );
}
