import { cn } from '@lorrigo/ui/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@lorrigo/ui/components';

interface HoverCardToolTipProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
  label?: string;
  children: React.ReactNode;
  className?: string;
  Icon?: React.ReactNode;
  triggerClassName?: string;
  triggerComponent?: React.ReactNode;
}
const HoverCardToolTip = ({ side, align, label, children, className, Icon, triggerClassName, triggerComponent }: HoverCardToolTipProps) => {
  return (
    <HoverCard openDelay={50}>
      <HoverCardTrigger
        className={cn(
          'w-min cursor-pointer text-nowrap capitalize',
          !Icon && !triggerComponent && 'border-b border-dashed border-blue-600 underline-offset-1',
          triggerClassName
        )}
      >
        {triggerComponent || label}
        {Icon}
      </HoverCardTrigger>
      <HoverCardContent side={side} align={align} className={cn('max-w-xs text-sm', className)}>
        {children}
      </HoverCardContent>
    </HoverCard>
  );
};

export default HoverCardToolTip;
