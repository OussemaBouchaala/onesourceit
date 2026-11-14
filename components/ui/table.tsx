import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    // Phones: each row becomes a card, each cell shows its column name (label prop).
    <div className="rounded-[20px] md:overflow-x-auto md:border md:border-line md:bg-card">
      <table className={cn("w-full border-collapse text-[15px] max-md:block", className)} {...props} />
    </div>
  );
}
function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead className="max-md:hidden" {...props} />;
}
function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody className="max-md:flex max-md:flex-col max-md:gap-3" {...props} />;
}
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-divider last:border-0",
        "max-md:grid max-md:grid-cols-2 max-md:gap-x-4 max-md:gap-y-3 max-md:rounded-[18px] max-md:border max-md:border-line max-md:bg-card max-md:p-4 max-md:last:border max-md:[&>td:first-child]:col-span-2 max-md:[&>td:only-child]:col-span-2",
        className,
      )}
      {...props}
    />
  );
}
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold tracking-[0.08em] whitespace-nowrap text-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}
function TableCell({ className, label, ...props }: React.ComponentProps<"td"> & { label?: string }) {
  return (
    <td
      data-label={label}
      className={cn(
        "px-4 py-3 align-top max-md:block max-md:p-0",
        label && "max-md:before:mb-0.5 max-md:before:block max-md:before:text-xs max-md:before:font-semibold max-md:before:tracking-[0.08em] max-md:before:text-muted max-md:before:uppercase max-md:before:content-[attr(data-label)]",
        className,
      )}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
