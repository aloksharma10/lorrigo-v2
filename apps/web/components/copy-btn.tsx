'use client';

import { cn } from '@lorrigo/ui/lib/utils';
import { CheckIcon, CopyIcon, Eye, EyeOff } from 'lucide-react';
import { useState, useCallback, useId } from 'react';
import ActionTooltip from './action-tooltip';
import { Button } from '@lorrigo/ui/components';

// Defining prop types for better reusability and type safety
interface CopyBtnProps {
  text: string;
  label?: string;
  className?: string;
  iconSize?: number;
  strokeWidth?: number;
  tooltipText?: string;
  successTooltipText?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  copyTimeout?: number;
  onCopySuccess?: () => void;
  onCopyError?: (error: Error) => void;
  labelClassName?: string;
  // New props for visibility toggle
  showVisibilityToggle?: boolean;
  initiallyVisible?: boolean;
  visibilityTooltipShow?: string;
  visibilityTooltipHide?: string;
  maskedChar?: string;
  onVisibilityChange?: (isVisible: boolean) => void;
}

function CopyBtn({
  text,
  label,
  className = '',
  iconSize = 10,
  strokeWidth = 2,
  tooltipText = 'Click to copy',
  successTooltipText = 'Copied!',
  variant = 'ghost',
  size = 'icon',
  copyTimeout = 1500,
  onCopySuccess,
  onCopyError,
  labelClassName = '',
  // New props with defaults
  showVisibilityToggle = false,
  initiallyVisible = false,
  visibilityTooltipShow = 'Show text',
  visibilityTooltipHide = 'Hide text',
  maskedChar = '•',
  onVisibilityChange,
}: CopyBtnProps) {
  // Generate unique ID for this component instance
  const componentId = useId();
  
  // Each instance maintains its own independent state
  const [copied, setCopied] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), copyTimeout);
    } catch (err) {
      console.error(`Failed to copy text for component ${componentId}:`, err);
      onCopyError?.(err as Error);
    }
  }, [text, copyTimeout, onCopySuccess, onCopyError, componentId]);

  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => {
      const newVisibility = !prev;
      onVisibilityChange?.(newVisibility);
      return newVisibility;
    });
  }, [onVisibilityChange]);

  const getMaskedText = useCallback((text: string) => {
    return maskedChar.repeat(text.length);
  }, [maskedChar]);

  // Each instance determines its own display text
  const displayText = showVisibilityToggle 
    ? (isVisible ? label : (label ? getMaskedText(label) : ''))
    : label;

  return (
    <div className="flex items-center gap-2" data-copy-btn-id={componentId}>
      {label && label !== 'N/A' && (
        <>
          <span className={cn('text-sm font-medium text-gray-700 select-none', labelClassName)}>
            {displayText}
          </span>
          
          {showVisibilityToggle && (
            <ActionTooltip label={isVisible ? visibilityTooltipHide : visibilityTooltipShow}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleVisibility}
                aria-label={`${isVisible ? visibilityTooltipHide : visibilityTooltipShow} for ${componentId}`}
              >
                {isVisible ? (
                  <EyeOff
                    size={iconSize}
                    strokeWidth={strokeWidth}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-hidden="true"
                  />
                ) : (
                  <Eye
                    size={iconSize}
                    strokeWidth={strokeWidth}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-hidden="true"
                  />
                )}
              </Button>
            </ActionTooltip>
          )}
        </>
      )}

      {label && label !== 'N/A' && (
        <ActionTooltip label={copied ? successTooltipText : tooltipText}>
          <Button
            variant={variant}
            size={size}
            className={cn('relative h-6 w-6 disabled:opacity-100', className)}
            onClick={handleCopy}
            aria-label={`${copied ? successTooltipText : tooltipText} for ${componentId}`}
            disabled={copied}
          >
            <div className="flex h-full w-full items-center justify-center">
              <CheckIcon
                className={cn('stroke-emerald-500 transition-opacity duration-300', {
                  'opacity-100': copied,
                  'opacity-0': !copied,
                })}
                size={iconSize}
                strokeWidth={strokeWidth}
                aria-hidden="true"
              />
              <CopyIcon
                className={cn('absolute transition-opacity duration-300', {
                  'opacity-0': copied,
                  'opacity-100': !copied,
                })}
                size={iconSize}
                strokeWidth={strokeWidth}
                aria-hidden="true"
              />
            </div>
          </Button>
        </ActionTooltip>
      )}
    </div>
  );
}

export { CopyBtn };
