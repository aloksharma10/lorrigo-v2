import { Skeleton } from "@lorrigo/ui/components"

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  cellHeight?: number
  rowClassName?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 6,
  showHeader = true,
  cellHeight = 16,
  rowClassName = "",
}: TableSkeletonProps) {
  // Generate column widths that add up to 12 grid columns
  const generateColumnSpans = (numColumns: number) => {
    const baseSpan = Math.floor(12 / numColumns)
    const remainder = 12 % numColumns
    
    return Array.from({ length: numColumns }, (_, i) => 
      i < remainder ? baseSpan + 1 : baseSpan
    )
  }
  
  const columnSpans = generateColumnSpans(columns)
  
  return (
    <div className="w-full space-y-4">
      {/* Table header */}
      {showHeader && (
        <div className="grid grid-cols-12 gap-4 border-b border-border pb-2">
          {columnSpans.map((span, i) => (
            <Skeleton 
              key={`header-${i}`} 
              className={`col-span-${span} h-${cellHeight / 4} w-full`} 
            />
          ))}
        </div>
      )}

      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`} 
          className={`grid grid-cols-12 gap-4 border-b border-border py-4 ${rowClassName}`}
        >
          {columnSpans.map((span, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className={`col-span-${span} flex flex-col gap-2`}>
              <Skeleton className={`h-${cellHeight / 4} w-${Math.floor(Math.random() * 40) + 20}`} />
              {Math.random() > 0.5 && <Skeleton className={`h-${cellHeight / 4} w-${Math.floor(Math.random() * 30) + 20}`} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}