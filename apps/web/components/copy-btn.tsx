'use client';

import { cn } from '@lorrigo/ui/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState, useCallback } from 'react';
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
}: CopyBtnProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), copyTimeout);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      onCopyError?.(err as Error);
    }
  }, [text, copyTimeout, onCopySuccess, onCopyError]);

  return (
    <div className="flex items-center gap-2">
      {label && label !== 'N/A' && (
        <span className={cn('text-sm font-medium text-gray-700', labelClassName)}>{label}</span>
      )}
      {label && label !== 'N/A' && (
        <ActionTooltip label={copied ? successTooltipText : tooltipText}>
          <Button
            variant={variant}
            size={size}
            className={cn('h-6 w-6 disabled:opacity-100 relative', className)}
            onClick={handleCopy}
            aria-label={copied ? successTooltipText : tooltipText}
            disabled={copied}
          >
            <div className="flex items-center justify-center w-full h-full">
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