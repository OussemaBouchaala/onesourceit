import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-divider text-ink",
        white: "bg-white text-navy",
        warn: "bg-warn-soft text-warn-ink",
        ok: "bg-ok-soft text-ok-ink",
        bad: "bg-bad-soft text-bad-ink",
        info: "bg-[#e8eefb] text-[#1d3a7a]",
        violet: "bg-[#efe8fb] text-[#4a2a86]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
