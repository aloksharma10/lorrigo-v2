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
  return (
    <Button
      variant="outline"
      className={cn('group relative overflow-hidden', className)}
      onClick={() => router.back()}
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
