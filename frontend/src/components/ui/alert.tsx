"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "relative w-full rounded-xl border p-4",
    "flex gap-3",
    "[&>svg]:shrink-0 [&>svg]:mt-0.5",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-neutral-50 border-neutral-200 text-neutral-900",
          "[&>svg]:text-neutral-600",
        ],
        info: [
          "bg-info-50 border-info-200 text-info-900",
          "[&>svg]:text-info-600",
        ],
        success: [
          "bg-success-50 border-success-200 text-success-900",
          "[&>svg]:text-success-600",
        ],
        warning: [
          "bg-warning-50 border-warning-200 text-warning-900",
          "[&>svg]:text-warning-600",
        ],
        error: [
          "bg-error-50 border-error-200 text-error-900",
          "[&>svg]:text-error-600",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const icons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  showIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = "default",
      title,
      dismissible,
      onDismiss,
      icon,
      showIcon = true,
      children,
      ...props
    },
    ref
  ) => {
    const Icon = icons[variant || "default"];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {showIcon && (icon || <Icon className="h-5 w-5" />)}
        <div className="flex-1 space-y-1">
          {title && (
            <h5 className="font-semibold leading-tight tracking-tight">
              {title}
            </h5>
          )}
          {children && (
            <div className="text-sm opacity-90 [&_p]:leading-relaxed">
              {children}
            </div>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              "absolute right-3 top-3 p-1 rounded-md",
              "opacity-70 hover:opacity-100",
              "transition-opacity duration-200",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              variant === "error" && "focus:ring-error-500",
              variant === "warning" && "focus:ring-warning-500",
              variant === "success" && "focus:ring-success-500",
              variant === "info" && "focus:ring-info-500",
              variant === "default" && "focus:ring-neutral-500"
            )}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = "Alert";

// Inline alert for forms
interface FormAlertProps {
  type: "error" | "success" | "warning";
  message: string;
  className?: string;
}

const FormAlert = ({ type, message, className }: FormAlertProps) => {
  const Icon = icons[type];
  const colorClasses = {
    error: "text-error-600",
    success: "text-success-600",
    warning: "text-warning-600",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm",
        colorClasses[type],
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export { Alert, FormAlert, alertVariants };
