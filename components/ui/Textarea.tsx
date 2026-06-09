"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    return (
      <label className="block" htmlFor={textareaId}>
        <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "min-h-36 w-full resize-y rounded-app border border-border bg-canvas px-4 py-3 text-base leading-7 text-ink shadow-inner transition placeholder:text-muted/70 focus:border-accent",
            className
          )}
          {...props}
        />
      </label>
    );
  }
);

Textarea.displayName = "Textarea";
