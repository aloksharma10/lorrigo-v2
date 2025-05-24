import { Skeleton } from "@lorrigo/ui/components"

interface CardSkeletonProps {
  numberOfCards?: number
}

export function CardSkeleton({ numberOfCards = 3 }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: numberOfCards }).map((_, i) => (
        <div 
          key={`card-${i}`} 
          className="rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="pt-4">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}