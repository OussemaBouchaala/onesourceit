import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-cta text-white hover:bg-cta-hover",
        secondary: "bg-white text-navy hover:bg-soft",
        outline: "border-[1.5px] border-ink bg-transparent text-ink hover:bg-card",
        ghost: "bg-transparent text-ink hover:bg-card",
        success: "bg-ok text-white hover:brightness-110",
      },
      size: {
        default: "min-h-12 px-6 py-3 text-base",
        sm: "min-h-11 px-4 py-2 text-sm",
        lg: "min-h-13 px-7 py-3.5 text-[17px]",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
