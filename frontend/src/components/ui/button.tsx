"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base styles
  [
    "inline-flex items-center justify-center gap-2",
    "font-semibold text-sm",
    "rounded-lg",
    "ring-offset-white",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
    "select-none",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-primary-600 text-white",
          "hover:bg-primary-700",
          "focus-visible:ring-primary-500",
          "shadow-sm hover:shadow-md",
        ],
        secondary: [
          "bg-secondary-100 text-secondary-900",
          "hover:bg-secondary-200",
          "focus-visible:ring-secondary-500",
        ],
        outline: [
          "border-2 border-neutral-300 bg-transparent",
          "hover:bg-neutral-50 hover:border-neutral-400",
          "text-neutral-700",
          "focus-visible:ring-neutral-400",
        ],
        ghost: [
          "bg-transparent",
          "hover:bg-neutral-100",
          "text-neutral-700",
          "focus-visible:ring-neutral-400",
        ],
        link: [
          "bg-transparent underline-offset-4",
          "hover:underline",
          "text-primary-600",
          "focus-visible:ring-primary-500",
        ],
        destructive: [
          "bg-error-600 text-white",
          "hover:bg-error-700",
          "focus-visible:ring-error-500",
          "shadow-sm hover:shadow-md",
        ],
        success: [
          "bg-success-600 text-white",
          "hover:bg-success-700",
          "focus-visible:ring-success-500",
          "shadow-sm hover:shadow-md",
        ],
        warning: [
          "bg-warning-500 text-white",
          "hover:bg-warning-600",
          "focus-visible:ring-warning-500",
          "shadow-sm hover:shadow-md",
        ],
        "primary-outline": [
          "border-2 border-primary-600 bg-transparent",
          "hover:bg-primary-50",
          "text-primary-600",
          "focus-visible:ring-primary-500",
        ],
        "primary-ghost": [
          "bg-transparent",
          "hover:bg-primary-50",
          "text-primary-600",
          "focus-visible:ring-primary-500",
        ],
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || isLoading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {!isLoading && leftIcon && (
          <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0">{rightIcon}</span>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
