"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  [
    "flex w-full min-h-[100px]",
    "bg-white text-neutral-900",
    "border border-neutral-300",
    "rounded-lg",
    "transition-all duration-200",
    "placeholder:text-neutral-400",
    "focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-primary-500 focus:ring-primary-500/20",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-50",
    "resize-y",
  ],
  {
    variants: {
      textareaSize: {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-3 text-sm",
        lg: "px-4 py-3 text-base",
      },
      hasError: {
        true: "border-error-500 focus:border-error-500 focus:ring-error-500/20",
      },
      hasSuccess: {
        true: "border-success-500 focus:border-success-500 focus:ring-success-500/20",
      },
    },
    defaultVariants: {
      textareaSize: "md",
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  error?: string;
  success?: string;
  hint?: string;
  label?: string;
  required?: boolean;
  containerClassName?: string;
  showCount?: boolean;
  maxLength?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      containerClassName,
      textareaSize,
      hasError,
      hasSuccess,
      error,
      success,
      hint,
      label,
      required,
      id,
      disabled,
      showCount = false,
      maxLength,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaId = id || React.useId();
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;
    const hasErrorState = hasError || !!error;
    const hasSuccessState = hasSuccess || !!success;
    
    const [charCount, setCharCount] = React.useState(
      typeof value === "string" ? value.length : 0
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    React.useEffect(() => {
      if (typeof value === "string") {
        setCharCount(value.length);
      }
    }, [value]);

    return (
      <div className={cn("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-neutral-700"
          >
            {label}
            {required && <span className="ml-0.5 text-error-500">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          disabled={disabled}
          aria-invalid={hasErrorState}
          aria-describedby={
            hasErrorState ? errorId : hint ? hintId : undefined
          }
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          className={cn(
            textareaVariants({
              textareaSize,
              hasError: hasErrorState,
              hasSuccess: hasSuccessState,
            }),
            className
          )}
          {...props}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex-1">
            {error && (
              <p id={errorId} className="text-sm text-error-600">
                {error}
              </p>
            )}
            {!error && success && (
              <p className="text-sm text-success-600">{success}</p>
            )}
            {!error && !success && hint && (
              <p id={hintId} className="text-sm text-neutral-500">
                {hint}
              </p>
            )}
          </div>
          {showCount && maxLength && (
            <span
              className={cn(
                "text-xs",
                charCount >= maxLength
                  ? "text-error-600"
                  : charCount >= maxLength * 0.9
                  ? "text-warning-600"
                  : "text-neutral-500"
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
