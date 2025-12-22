"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
      xl: "h-12 w-12",
    };

    return (
      <Loader2
        ref={ref}
        className={cn("animate-spin text-primary-600", sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

Spinner.displayName = "Spinner";

// Full page loading component
interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

const Loading = ({
  message = "Loading...",
  fullScreen = false,
  className,
}: LoadingProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen && "fixed inset-0 z-50 bg-white/80 backdrop-blur-sm",
        !fullScreen && "py-12",
        className
      )}
    >
      <Spinner size="lg" />
      {message && (
        <p className="text-sm text-neutral-500 animate-pulse">{message}</p>
      )}
    </div>
  );
};

// Inline loading for buttons/small areas
interface InlineLoadingProps {
  className?: string;
}

const InlineLoading = ({ className }: InlineLoadingProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Spinner size="sm" />
      <span className="text-sm text-neutral-500">Loading...</span>
    </div>
  );
};

// Overlay loading for cards/sections
interface OverlayLoadingProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}

const OverlayLoading = ({
  isLoading,
  children,
  className,
}: OverlayLoadingProps) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-inherit">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  );
};

export { Spinner, Loading, InlineLoading, OverlayLoading };
