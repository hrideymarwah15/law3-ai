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
          "bg-[#4F46E5] text-white",
          "hover:bg-[#4338CA]",
          "focus-visible:ring-[#6366F1]",
          "shadow-sm hover:shadow-md",
        ],
        secondary: [
          "bg-[#EDE9FE] text-[#4C1D95]",
          "hover:bg-[#DDD6FE]",
          "focus-visible:ring-[#8B5CF6]",
        ],
        outline: [
          "border-2 border-[#CBD5E1] bg-transparent",
          "hover:bg-[#F8FAFC] hover:border-[#94A3B8]",
          "text-[#334155]",
          "focus-visible:ring-[#94A3B8]",
        ],
        ghost: [
          "bg-transparent",
          "hover:bg-[#F1F5F9]",
          "text-[#334155]",
          "focus-visible:ring-[#94A3B8]",
        ],
        link: [
          "bg-transparent underline-offset-4",
          "hover:underline",
          "text-[#4F46E5]",
          "focus-visible:ring-[#6366F1]",
        ],
        destructive: [
          "bg-[#E11D48] text-white",
          "hover:bg-[#BE123C]",
          "focus-visible:ring-[#F43F5E]",
          "shadow-sm hover:shadow-md",
        ],
        success: [
          "bg-[#059669] text-white",
          "hover:bg-[#047857]",
          "focus-visible:ring-[#10B981]",
          "shadow-sm hover:shadow-md",
        ],
        warning: [
          "bg-[#F59E0B] text-white",
          "hover:bg-[#D97706]",
          "focus-visible:ring-[#F59E0B]",
          "shadow-sm hover:shadow-md",
        ],
        "primary-outline": [
          "border-2 border-[#4F46E5] bg-transparent",
          "hover:bg-[#EEF2FF]",
          "text-[#4F46E5]",
          "focus-visible:ring-[#6366F1]",
        ],
        "primary-ghost": [
          "bg-transparent",
          "hover:bg-[#EEF2FF]",
          "text-[#4F46E5]",
          "focus-visible:ring-[#6366F1]",
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

    // When asChild is true, we can't add wrapper elements - pass children directly
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

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
