import type * as React from "react"
import { cn } from "@lorrigo/ui/lib/utils"
import { Search } from "lucide-react"

interface InputProps extends Omit<React.ComponentProps<"input">, "size"> {
  isLoading?: boolean
  size?: "sm" | "md" | "lg"
}

function Input({ className, isLoading, type, size = "md", ...props }: InputProps) {
  return (
    <div className={cn("relative w-full", className?.includes("hidden") ? "hidden" : "")}>
       {type === "search" && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input shadow-xs flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          isLoading && 'pr-10', // Add padding for spinner
          type === "search" && "pl-9",
          size === "sm" && "h-8 text-sm",
          size === "md" && "h-9 text-sm",
          size === "lg" && "h-10 text-sm",
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="border-muted-foreground h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}

export { Input };
