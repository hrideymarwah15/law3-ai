"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-3", className)}
      {...props}
      ref={ref}
    />
  );
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

export interface RadioGroupItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label?: string;
  description?: string;
}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, label, description, id, ...props }, ref) => {
  const generatedId = React.useId();
  const radioId = id || generatedId;

  const radioElement = (
    <RadioGroupPrimitive.Item
      ref={ref}
      id={radioId}
      className={cn(
        "aspect-square h-5 w-5",
        "rounded-full border-2 border-neutral-300",
        "ring-offset-white transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-primary-600",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-primary-600 text-primary-600" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );

  if (!label && !description) {
    return radioElement;
  }

  return (
    <div className="flex items-start gap-3">
      {radioElement}
      <div className="grid gap-0.5 leading-none">
        {label && (
          <label
            htmlFor={radioId}
            className="text-sm font-medium text-neutral-900 cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
    </div>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

// Card variant for radio selection
interface RadioCardProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  icon?: React.ReactNode;
  label: string;
  description?: string;
}

const RadioCard = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioCardProps
>(({ className, icon, label, description, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex items-start gap-4 p-4",
        "rounded-xl border-2 border-neutral-200 bg-white",
        "cursor-pointer transition-all duration-200",
        "hover:border-neutral-300 hover:bg-neutral-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 focus-visible:ring-offset-0",
        "data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 data-[state=checked]:bg-primary-100 data-[state=checked]:text-primary-600">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-900">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
        )}
      </div>
      <div className="absolute right-4 top-4">
        <div className="h-5 w-5 rounded-full border-2 border-neutral-300 transition-all duration-200 data-[state=checked]:border-primary-600">
          <RadioGroupPrimitive.Indicator className="flex h-full w-full items-center justify-center">
            <Circle className="h-2.5 w-2.5 fill-primary-600 text-primary-600" />
          </RadioGroupPrimitive.Indicator>
        </div>
      </div>
    </RadioGroupPrimitive.Item>
  );
});
RadioCard.displayName = "RadioCard";

// Field wrapper with label
interface RadioGroupFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  containerClassName?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  orientation?: "horizontal" | "vertical";
}

const RadioGroupField = ({
  label,
  required,
  error,
  hint,
  children,
  containerClassName,
  value,
  onValueChange,
  defaultValue,
  disabled,
  name,
  orientation = "vertical",
}: RadioGroupFieldProps) => {
  const id = React.useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="ml-0.5 text-error-500">*</span>}
        </label>
      )}
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        orientation={orientation}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          orientation === "horizontal" && "flex flex-wrap gap-4"
        )}
      >
        {children}
      </RadioGroup>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-error-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="mt-1.5 text-sm text-neutral-500">
          {hint}
        </p>
      )}
    </div>
  );
};

export { RadioGroup, RadioGroupItem, RadioCard, RadioGroupField };
