"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  // Base styles
  [
    "flex w-full",
    "bg-white text-neutral-900",
    "border border-neutral-300",
    "rounded-lg",
    "transition-all duration-200",
    "placeholder:text-neutral-400",
    "focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500/20",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
  ],
  {
    variants: {
      inputSize: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-4 text-base",
      },
      hasError: {
        true: "border-error-500 focus:border-error-500 focus:ring-error-500/20",
      },
      hasSuccess: {
        true: "border-success-500 focus:border-success-500 focus:ring-success-500/20",
      },
    },
    defaultVariants: {
      inputSize: "md",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  success?: string;
  hint?: string;
  label?: string;
  required?: boolean;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      containerClassName,
      type = "text",
      inputSize,
      hasError,
      hasSuccess,
      leftElement,
      rightElement,
      error,
      success,
      hint,
      label,
      required,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const hasErrorState = hasError || !!error;
    const hasSuccessState = hasSuccess || !!success;

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            {label}
            {required && <span className="ml-0.5 text-error-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftElement && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              {leftElement}
            </div>
          )}
          <input
            type={type}
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={hasErrorState}
            aria-describedby={
              hasErrorState ? errorId : hint ? hintId : undefined
            }
            className={cn(
              inputVariants({
                inputSize,
                hasError: hasErrorState,
                hasSuccess: hasSuccessState,
              }),
              leftElement && "pl-10",
              rightElement && "pr-10",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-error-600">
            {error}
          </p>
        )}
        {!error && success && (
          <p className="mt-1.5 text-sm text-success-600">{success}</p>
        )}
        {!error && !success && hint && (
          <p id={hintId} className="mt-1.5 text-sm text-neutral-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input, inputVariants };
