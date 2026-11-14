"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Password field with a show / hide toggle. */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <span className="relative block">
      <Input type={visible ? "text" : "password"} className={cn("pr-14", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-soft hover:text-ink focus-visible:outline-3 focus-visible:outline-ring"
      >
        <Icon aria-hidden className="size-5" strokeWidth={1.8} />
      </button>
    </span>
  );
}

export { PasswordInput };
