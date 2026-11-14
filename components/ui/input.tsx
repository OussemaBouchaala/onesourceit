import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full min-h-12 rounded-xl border-[1.5px] border-line-strong bg-navy-deep px-3.5 py-3 text-base text-ink placeholder:text-muted/70 focus-visible:border-cta focus-visible:outline-3 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-[#0e2e4c] disabled:text-[#7f93a8]";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(fieldClass, className)} {...props} />;
}

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(fieldClass, "appearance-auto", className)} {...props} />;
}

export { Input, NativeSelect };
