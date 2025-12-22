"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    { className, label, description, error, indeterminate, id, ...props },
    ref
  ) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    const checkboxElement = (
      <CheckboxPrimitive.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          "peer h-5 w-5 shrink-0",
          "rounded-md border-2 border-neutral-300",
          "ring-offset-white transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 data-[state=checked]:text-white",
          "data-[state=indeterminate]:border-primary-600 data-[state=indeterminate]:bg-primary-600 data-[state=indeterminate]:text-white",
          error && "border-error-500",
          className
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-current")}
        >
          {indeterminate ? (
            <Minus className="h-3.5 w-3.5" strokeWidth={3} />
          ) : (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          )}
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (!label && !description) {
      return checkboxElement;
    }

    return (
      <div className="flex items-start gap-3">
        {checkboxElement}
        <div className="grid gap-0.5 leading-none">
          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                "text-sm font-medium text-neutral-900 cursor-pointer",
                "peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
          {error && <p className="text-sm text-error-600">{error}</p>}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
