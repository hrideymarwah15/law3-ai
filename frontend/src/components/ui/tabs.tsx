"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "default" | "pills" | "underline";
    fullWidth?: boolean;
  }
>(({ className, variant = "default", fullWidth, ...props }, ref) => {
  const variantClasses = {
    default: [
      "inline-flex items-center justify-center",
      "rounded-lg bg-neutral-100 p-1",
      "text-neutral-500",
    ],
    pills: [
      "inline-flex items-center gap-2",
    ],
    underline: [
      "inline-flex items-center gap-6",
      "border-b border-neutral-200",
    ],
  };

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        variantClasses[variant],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    variant?: "default" | "pills" | "underline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClasses = {
    default: [
      "inline-flex items-center justify-center whitespace-nowrap",
      "rounded-md px-3 py-1.5",
      "text-sm font-medium",
      "ring-offset-white transition-all",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-0",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm",
    ],
    pills: [
      "inline-flex items-center justify-center whitespace-nowrap",
      "rounded-full px-4 py-2",
      "text-sm font-medium",
      "border border-transparent",
      "transition-all duration-200",
      "hover:bg-neutral-100",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:bg-primary-600 data-[state=active]:text-white data-[state=active]:border-primary-600",
    ],
    underline: [
      "inline-flex items-center justify-center whitespace-nowrap",
      "pb-3 px-1 -mb-px",
      "text-sm font-medium text-neutral-500",
      "border-b-2 border-transparent",
      "transition-all duration-200",
      "hover:text-neutral-700",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:text-primary-600 data-[state=active]:border-primary-600",
    ],
  };

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(variantClasses[variant], className)}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-white",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-0",
      "data-[state=inactive]:hidden",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
