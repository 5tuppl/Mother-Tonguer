"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface IconButtonProps extends Omit<ButtonProps, "size"> {
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, className, children, ...props }, ref) => (
    <Button
      ref={ref}
      aria-label={label}
      title={label}
      size="icon"
      variant="secondary"
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </Button>
  )
);

IconButton.displayName = "IconButton";
