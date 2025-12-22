"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  [
    "relative flex shrink-0 overflow-hidden rounded-full",
    "bg-neutral-100",
  ],
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-xs",
        sm: "h-8 w-8 text-sm",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
        "2xl": "h-20 w-20 text-xl",
        "3xl": "h-24 w-24 text-2xl",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

type AvatarVariantProps = VariantProps<typeof avatarVariants>;

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    AvatarVariantProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  status?: "online" | "offline" | "busy" | "away";
  verified?: boolean;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(
  (
    { className, size, src, alt, fallback, status, verified, ...props },
    ref
  ) => {
    // Generate initials from alt text or fallback
    const getInitials = () => {
      const text = fallback || alt || "";
      const words = text.trim().split(" ");
      if (words.length === 0) return "";
      if (words.length === 1) return words[0].charAt(0).toUpperCase();
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    const statusColors = {
      online: "bg-success-500",
      offline: "bg-neutral-400",
      busy: "bg-error-500",
      away: "bg-warning-500",
    };

    const statusSizes = {
      xs: "h-1.5 w-1.5 border",
      sm: "h-2 w-2 border",
      md: "h-2.5 w-2.5 border-2",
      lg: "h-3 w-3 border-2",
      xl: "h-4 w-4 border-2",
      "2xl": "h-5 w-5 border-2",
      "3xl": "h-6 w-6 border-2",
    };

    return (
      <div className="relative inline-flex">
        <AvatarPrimitive.Root
          ref={ref}
          className={cn(avatarVariants({ size }), className)}
          {...props}
        >
          <AvatarPrimitive.Image
            src={src || undefined}
            alt={alt}
            className="aspect-square h-full w-full object-cover"
          />
          <AvatarPrimitive.Fallback
            className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-600 font-medium"
            delayMs={600}
          >
            {getInitials() || <User className="h-[45%] w-[45%]" />}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>

        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full border-white",
              statusColors[status],
              statusSizes[size || "md"]
            )}
          />
        )}

        {verified && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white">
            <svg
              className="h-2.5 w-2.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = AvatarPrimitive.Root.displayName;

// Avatar Group for showing multiple avatars
interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarVariantProps["size"];
  className?: string;
}

const AvatarGroup = ({
  children,
  max = 4,
  size = "md",
  className,
}: AvatarGroupProps) => {
  const childArray = React.Children.toArray(children);
  const visibleCount = Math.min(childArray.length, max);
  const remainingCount = childArray.length - visibleCount;

  const overlapSizes = {
    xs: "-space-x-2",
    sm: "-space-x-2.5",
    md: "-space-x-3",
    lg: "-space-x-4",
    xl: "-space-x-5",
    "2xl": "-space-x-6",
    "3xl": "-space-x-7",
  };

  return (
    <div className={cn("flex items-center", overlapSizes[size || "md"], className)}>
      {childArray.slice(0, visibleCount).map((child, index) => (
        <div
          key={index}
          className="relative ring-2 ring-white rounded-full"
          style={{ zIndex: visibleCount - index }}
        >
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 font-medium ring-2 ring-white",
            avatarVariants({ size })
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export { Avatar, AvatarGroup, avatarVariants };
