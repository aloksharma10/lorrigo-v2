import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@lorrigo/ui/components';

interface ActionTooltipProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  label: string;
  children: React.ReactNode;
}
const ActionTooltip = ({ side, align, label, children }: ActionTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild className="cursor-pointer p-1 hover:rounded-md">
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} className="text-secondary-foreground">
          <p className="text-sm font-semibold capitalize">{label.toLowerCase()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ActionTooltip;
