'use client'
 
import { cn } from '@lorrigo/ui/lib/utils'
import { Loader2Icon } from 'lucide-react'
import { useLinkStatus } from 'next/link'
 
export default function LoadingIndicator({className}: {className?: string}) {
  const { pending } = useLinkStatus()
  return pending ? (
    <Loader2Icon role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} />
  ) : null
}