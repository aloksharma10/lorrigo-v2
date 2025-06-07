import { Button } from "@lorrigo/ui/components"
import { cn } from "@lorrigo/ui/lib/utils"
import { Loader2 } from "lucide-react"

export const SubmitBtn = ({ isLoading, text, className, disabled, ...props }: { isLoading: boolean, text: string, className?: string, disabled?: boolean, props?: any }) => {
   return (
      <Button disabled={isLoading || disabled} variant={'default'} type='submit' className={cn(className)} {...props}>
         {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : text}
      </Button>
   )
}
