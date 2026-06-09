"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label: string;
}

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ label, className, ...props }, ref) => (
    <label className="inline-flex items-center gap-3 text-sm font-semibold text-ink">
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-7 w-12 rounded-full border border-border bg-muted/30 transition data-[state=checked]:bg-accent",
          className
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-6" />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  )
);

Switch.displayName = "Switch";
