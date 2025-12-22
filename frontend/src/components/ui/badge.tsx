"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center",
    "rounded-full font-medium",
    "transition-colors duration-200",
  ],
  {
    variants: {
      variant: {
        default: "bg-neutral-100 text-neutral-700",
        primary: "bg-primary-100 text-primary-700",
        secondary: "bg-secondary-100 text-secondary-700",
        success: "bg-success-50 text-success-700",
        warning: "bg-warning-50 text-warning-700",
        error: "bg-error-50 text-error-700",
        info: "bg-info-50 text-info-700",
        outline: "border border-neutral-300 text-neutral-700 bg-transparent",
        "primary-outline": "border border-primary-300 text-primary-700 bg-transparent",
        "success-outline": "border border-success-300 text-success-700 bg-transparent",
        "error-outline": "border border-error-300 text-error-700 bg-transparent",
        // Solid variants
        "primary-solid": "bg-primary-600 text-white",
        "success-solid": "bg-success-600 text-white",
        "warning-solid": "bg-warning-500 text-white",
        "error-solid": "bg-error-600 text-white",
        "info-solid": "bg-info-600 text-white",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean;
  onRemove?: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      removable,
      onRemove,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {leftIcon && <span className="mr-1 -ml-0.5">{leftIcon}</span>}
        {children}
        {rightIcon && !removable && (
          <span className="ml-1 -mr-0.5">{rightIcon}</span>
        )}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="ml-1 -mr-1 rounded-full p-0.5 hover:bg-black/10 transition-colors"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

Badge.displayName = "Badge";

// Status badge with dot indicator
interface StatusBadgeProps extends Omit<BadgeProps, "leftIcon"> {
  status: "online" | "offline" | "busy" | "away" | "pending" | "active" | "inactive";
}

const statusConfig = {
  online: { color: "bg-success-500", label: "Online" },
  offline: { color: "bg-neutral-400", label: "Offline" },
  busy: { color: "bg-error-500", label: "Busy" },
  away: { color: "bg-warning-500", label: "Away" },
  pending: { color: "bg-warning-500", label: "Pending" },
  active: { color: "bg-success-500", label: "Active" },
  inactive: { color: "bg-neutral-400", label: "Inactive" },
};

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, children, className, ...props }, ref) => {
    const config = statusConfig[status];

    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn("gap-1.5", className)}
        {...props}
      >
        <span
          className={cn("h-2 w-2 rounded-full animate-pulse", config.color)}
        />
        {children || config.label}
      </Badge>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

// Notification badge/counter
interface CountBadgeProps {
  count: number;
  maxCount?: number;
  className?: string;
  variant?: "primary" | "error" | "warning";
}

const CountBadge = ({
  count,
  maxCount = 99,
  className,
  variant = "error",
}: CountBadgeProps) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const variantStyles = {
    primary: "bg-primary-600",
    error: "bg-error-600",
    warning: "bg-warning-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[18px] h-[18px] px-1",
        "rounded-full text-[10px] font-bold text-white",
        variantStyles[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
};

export { Badge, StatusBadge, CountBadge, badgeVariants };
