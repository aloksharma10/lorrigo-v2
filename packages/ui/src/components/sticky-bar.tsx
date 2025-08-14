'use client';

import { useState, useEffect, ReactNode } from 'react';
import { cn } from '@lorrigo/ui/lib/utils'; // Utility for className merging, adjust if using a different utility

interface StickyBarProps {
  children: ReactNode;
  position?: 'top' | 'bottom';
  initialBgClass?: string;
  scrolledBgClass?: string;
  borderClass?: string;
  className?: string;
  zIndex?: number;
  transitionDuration?: string;
}

export function StickyBar({
  children,
  position = 'top',
  initialBgClass = 'bg-background/90 supports-[backdrop-filter]:bg-background/60 backdrop-blur-xs',
  scrolledBgClass = 'bg-background',
  borderClass = 'border-b border-neutral-200 dark:border-neutral-800',
  className = '',
  zIndex = 40,
  transitionDuration = '600',
}: StickyBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={cn(
        'sticky flex shrink-0 items-center rounded-lg',
        position === 'top' ? 'top-0' : 'bottom-0',
        borderClass,
        isScrolled ? scrolledBgClass : initialBgClass,
        `transition-all duration-${transitionDuration} ease-in-out z-${zIndex}`,
        className
      )}
    >
      {children}
    </div>
  );
}