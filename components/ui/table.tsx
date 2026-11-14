import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-line bg-card">
      <table className={cn("w-full border-collapse text-[15px]", className)} {...props} />
    </div>
  );
}
function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead {...props} />;
}
function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-divider last:border-0", className)} {...props} />;
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
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-top", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
