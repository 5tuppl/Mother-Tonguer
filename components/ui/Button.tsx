"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white shadow-glow hover:bg-accent/90 active:bg-accent/95",
  secondary: "border border-border bg-panel text-ink shadow-sm hover:border-accent/45 hover:bg-accent/5",
  ghost: "text-ink hover:bg-ink/5 data-[state=active]:bg-accent/10 data-[state=active]:text-accent",
  danger: "bg-danger text-white hover:bg-danger/90",
  quiet: "text-muted hover:bg-ink/5 hover:text-ink"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 gap-2 px-3 text-sm",
  md: "h-11 gap-2 px-4 text-sm",
  lg: "h-13 gap-2 px-5 text-base",
  icon: "h-11 w-11 p-0"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-w-0 select-none items-center justify-center rounded-app font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-55",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
);

Button.displayName = "Button";
