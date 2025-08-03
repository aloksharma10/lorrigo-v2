'use client';

import { Button } from '@lorrigo/ui/components';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@lorrigo/ui/lib/utils';

export function BackButton({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const router = useRouter();

  const handleBack = () => {
    const referrer = document.referrer;

    try {
      const url = new URL(referrer);
      const isSameDomain = 
        url.hostname.endsWith('lorrigo.com') || 
        url.hostname === 'localhost' || 
        url.hostname === '127.0.0.1';

      if (isSameDomain) {
        router.back(); // safe to go back
      } else {
        router.push('/'); // redirect to safe default (like homepage or dashboard)
      }
    } catch (error) {
      // If referrer is not a valid URL (empty or malformed), redirect to home
      router.push('/');
    }
  };

  return (
    <Button
      variant="outline"
      className={cn('group relative overflow-hidden', className)}
      onClick={handleBack}
    >
      {showLabel && (
        <span className="w-20 translate-x-2 transition-opacity duration-500 group-hover:opacity-0">
          Back
        </span>
      )}
      <i
        className={cn(
          'bg-primary-foreground/15 absolute inset-0 z-10 grid place-items-center transition-all duration-500 group-hover:w-full',
          showLabel ? 'w-1/4' : 'w-full'
        )}
      >
        <ArrowLeft className="opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
      </i>
    </Button>
  );
}