"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  label?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, label, description, size = "md", id, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;

  const sizeStyles = {
    sm: {
      root: "h-5 w-9",
      thumb: "h-4 w-4 data-[state=checked]:translate-x-4",
    },
    md: {
      root: "h-6 w-11",
      thumb: "h-5 w-5 data-[state=checked]:translate-x-5",
    },
    lg: {
      root: "h-7 w-14",
      thumb: "h-6 w-6 data-[state=checked]:translate-x-7",
    },
  };

  const switchElement = (
    <SwitchPrimitives.Root
      id={switchId}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-primary-600 data-[state=unchecked]:bg-neutral-200",
        sizeStyles[size].root,
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-lg",
          "ring-0 transition-transform duration-200",
          sizeStyles[size].thumb
        )}
      />
    </SwitchPrimitives.Root>
  );

  if (!label && !description) {
    return switchElement;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="grid gap-0.5">
        {label && (
          <label
            htmlFor={switchId}
            className="text-sm font-medium text-neutral-900 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {switchElement}
    </div>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
