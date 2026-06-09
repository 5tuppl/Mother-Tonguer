import * as React from "react";
import { cn } from "@/lib/cn";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full min-w-0 items-center rounded-full border border-border bg-panel px-3 text-xs font-semibold text-muted",
        className
      )}
      {...props}
    />
  );
}
