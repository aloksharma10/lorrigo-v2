'use client';

import { cn } from '@lorrigo/ui/lib/utils';
import { CheckIcon, CopyIcon, Eye, EyeOff, ExternalLink } from 'lucide-react';
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
  // New props for external links
  enableExternalLinks?: boolean;
  externalLinkTooltip?: string;
  url?: string;
}

export function CopyBtn({
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
  // External link props
  enableExternalLinks = false,
  url,
  externalLinkTooltip = 'Open link in new tab',
}: CopyBtnProps) {
  // Generate unique ID for this component instance
  const componentId = useId();

  // Each instance maintains its own independent state
  const [copied, setCopied] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(initiallyVisible);
  const [showExternalIcon, setShowExternalIcon] = useState<boolean>(false);

  // URL detection function
  const isValidUrl = useCallback((string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }, []);

  // Check if the text is a URL
  const isUrl = enableExternalLinks && isValidUrl(url ?? '');

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

  const handleTextClick = useCallback(() => {
    if (isUrl) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [isUrl, url]);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => {
      const newVisibility = !prev;
      onVisibilityChange?.(newVisibility);
      return newVisibility;
    });
  }, [onVisibilityChange]);

  const getMaskedText = useCallback(
    (text: string) => {
      return maskedChar.repeat(text.length);
    },
    [maskedChar]
  );

  // Each instance determines its own display text
  const displayText = showVisibilityToggle ? (isVisible ? label : label ? getMaskedText(label) : '') : label;

  return (
    <div className="flex items-center gap-2" data-copy-btn-id={componentId}>
      {label && label !== 'N/A' && (
        <>
          <span 
            className={cn(
              'select-none text-sm font-medium text-gray-700 relative inline-flex items-center gap-1',
              isUrl && 'cursor-pointer hover:text-blue-600 transition-colors',
              labelClassName
            )}
            onClick={handleTextClick}
            onMouseEnter={() => isUrl && setShowExternalIcon(true)}
            onMouseLeave={() => isUrl && setShowExternalIcon(false)}
            role={isUrl ? 'button' : undefined}
            tabIndex={isUrl ? 0 : undefined}
            onKeyDown={isUrl ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTextClick();
              }
            } : undefined}
            aria-label={isUrl ? `${externalLinkTooltip}: ${displayText}` : undefined}
          >
            {displayText}
            {isUrl && (
              <ExternalLink 
                size={14} 
                strokeWidth={strokeWidth}
                className={cn(
                  'text-blue-600 absolute -right-3 top-0 -translate-y-1/2 transition-opacity duration-200',
                  showExternalIcon ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden="true"
              />
            )}
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
                  <EyeOff size={iconSize} strokeWidth={strokeWidth} className="text-gray-500 transition-colors hover:text-gray-700" aria-hidden="true" />
                ) : (
                  <Eye size={iconSize} strokeWidth={strokeWidth} className="text-gray-500 transition-colors hover:text-gray-700" aria-hidden="true" />
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
            aria-label={`${copied ? successTooltipText : "Click to copy"} for ${componentId}`}
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

