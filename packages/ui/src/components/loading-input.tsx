'use client';

import * as React from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { Input } from './input';
import { cn } from '../lib/utils';

export interface LoadingInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  isLoading?: boolean;
  icon?: React.ElementType;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  iconClassName?: string;
  containerClassName?: string;
  showLoadingWhileTyping?: boolean;
  typingDelay?: number;
}

const LoadingInput = React.forwardRef<HTMLInputElement, LoadingInputProps>(
  (
    {
      className,
      type = 'text',
      isLoading = false,
      onValueChange,
      onChange,
      icon: Icon,
      iconClassName,
      containerClassName,
      disabled,
      showLoadingWhileTyping = true,
      typingDelay = 300,
      ...props
    },
    ref
  ) => {
    const [isTyping, setIsTyping] = React.useState(false);
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onValueChange?.(e.target.value);

      if (showLoadingWhileTyping) {
        setIsTyping(true);

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop loading state
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, typingDelay);
      }
    };

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }, []);

    const showLoading = isLoading || (showLoadingWhileTyping && isTyping);

    return (
      <div className={cn('relative', containerClassName)}>
        <Input
          type={type}
          data-slot="input"
          className={cn(
            'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border text-xs file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            'pl-3 pr-9', // Space for search icon
            className
          )}
          ref={ref}
          onChange={handleChange}
          disabled={disabled} // Removed isLoading from disabled condition
          {...props}
        />
        <div
          className={cn(
            'text-muted-foreground/80 pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center pr-3',
            disabled && 'opacity-50',
            iconClassName
          )}
        >
          {showLoading ? (
            <LoaderCircle
              className="animate-spin"
              size={16}
              strokeWidth={2}
              role="status"
              aria-label="Loading..."
            />
          ) : (
            Icon && <Icon size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </div>
      </div>
    );
  }
);
LoadingInput.displayName = 'LoadingInput';

export { LoadingInput };
