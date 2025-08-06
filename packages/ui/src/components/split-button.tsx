"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./";
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState, forwardRef } from "react";
import { cn } from "../lib/utils";

export interface SplitButtonOption {
  label: string;
  description?: string;
  value: string;
  disabled?: boolean;
}

export interface SplitButtonProps {
  options: SplitButtonOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onMainAction?: (selectedOption: SplitButtonOption) => void;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  dropdownClassName?: string;
  mainButtonClassName?: string;
  triggerButtonClassName?: string;
  dropdownAlign?: "start" | "center" | "end";
  dropdownSide?: "top" | "right" | "bottom" | "left";
  dropdownSideOffset?: number;
  placeholder?: string;
  loadingText?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

const SplitButton = forwardRef<HTMLDivElement, SplitButtonProps>(
  (
    {
      options,
      defaultValue,
      value,
      onValueChange,
      onMainAction,
      loading = false,
      disabled = false,
      size = "sm",
      variant = "default",
      className,
      dropdownClassName,
      mainButtonClassName,
      triggerButtonClassName,
      dropdownAlign = "end",
      dropdownSide = "bottom",
      dropdownSideOffset = 4,
      placeholder = "Select option",
      loadingText = "Loading...",
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedby,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || "");
    
    const isControlled = value !== undefined;
    const selectedValue = isControlled ? value : internalValue;
    
    const selectedOption = options.find(option => option.value === selectedValue) || options[0];
    
    const handleValueChange = (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const handleMainAction = () => {
      if (selectedOption && !loading && !disabled) {
        onMainAction?.(selectedOption);
      }
    };

    const isMainButtonDisabled = disabled || loading || !selectedOption || selectedOption.disabled;
    const isTriggerDisabled = disabled || loading || options.every(option => option.disabled);

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex -space-x-px divide-x divide-primary-foreground/30 rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse",
          className
        )}
        {...props}
      >
        <Button
          onClick={handleMainAction}
          disabled={isMainButtonDisabled}
          size={size}
          variant={variant}
          className={cn(
            "rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            mainButtonClassName
          )}
          aria-label={ariaLabel || `Execute ${selectedOption?.label || placeholder}`}
          aria-describedby={ariaDescribedby}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? loadingText : (selectedOption?.label || placeholder)}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              disabled={isTriggerDisabled}
              size={size}
              variant={variant}
              className={cn(
                "rounded-none shadow-none first:rounded-s-lg last:rounded-e-lg focus-visible:z-10",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                size === "sm" ? "px-2" : size === "lg" ? "px-3" : "px-2.5",
                triggerButtonClassName
              )}
              aria-label="More options"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className={cn("max-w-64 md:max-w-xs", dropdownClassName)}
            side={dropdownSide}
            sideOffset={dropdownSideOffset}
            align={dropdownAlign}
          >
            <DropdownMenuRadioGroup 
              value={selectedValue} 
              onValueChange={handleValueChange}
            >
              {options.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled || loading}
                  className={cn(
                    "items-start [&>span]:pt-1.5",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);

SplitButton.displayName = "SplitButton";

export { SplitButton };
