"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Skeleton component for loading states
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "rounded" | "text";
  animation?: "pulse" | "shimmer" | "none";
  width?: string | number;
  height?: string | number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "default",
      animation = "pulse",
      width,
      height,
      style,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: "rounded-md",
      circular: "rounded-full",
      rounded: "rounded-xl",
      text: "rounded h-4 w-full",
    };

    const animationClasses = {
      pulse: "animate-pulse",
      shimmer: "animate-shimmer bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%]",
      none: "",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-neutral-200",
          variantClasses[variant],
          animationClasses[animation],
          className
        )}
        style={{
          width: width,
          height: height,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// Pre-built skeleton layouts
const SkeletonText = ({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={cn("space-y-2", className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn(i === lines - 1 && "w-3/4")}
      />
    ))}
  </div>
);

const SkeletonCard = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "rounded-xl border border-neutral-200 p-6 space-y-4",
      className
    )}
  >
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

const SkeletonAvatar = ({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) => {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <Skeleton
      variant="circular"
      className={cn(sizes[size], className)}
    />
  );
};

const SkeletonButton = ({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) => {
  const sizes = {
    sm: "h-9 w-20",
    md: "h-10 w-24",
    lg: "h-11 w-28",
  };

  return (
    <Skeleton className={cn(sizes[size], "rounded-lg", className)} />
  );
};

const SkeletonTable = ({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) => (
  <div className={cn("space-y-3", className)}>
    {/* Header */}
    <div className="flex gap-4 pb-2 border-b border-neutral-200">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            className={cn(
              "h-4 flex-1",
              colIndex === 0 && "w-1/6 flex-none"
            )}
          />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonList = ({
  items = 5,
  className,
}: {
  items?: number;
  className?: string;
}) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <SkeletonAvatar size="md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    ))}
  </div>
);

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonTable,
  SkeletonList,
};
