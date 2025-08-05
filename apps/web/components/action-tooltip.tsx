import { cn } from '@lorrigo/ui/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@lorrigo/ui/components';

interface ActionTooltipProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}
const ActionTooltip = ({ side, align, label, children, className, labelClassName }: ActionTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild className={cn('cursor-pointer p-1 hover:rounded-md', className)}>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="text-secondary-foreground border px-2 py-1">
          <p className={cn('text-sm font-semibold capitalize', labelClassName)}>{label.toLowerCase()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ActionTooltip;
