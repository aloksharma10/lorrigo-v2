import { cn } from "@lorrigo/ui/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@lorrigo/ui/components";

interface HoverCardToolTipProps {
    side?: "left" | "right" | "top" | "bottom";
    align?: "start" | "center" | "end";
    label?: string;
    children: React.ReactNode;
    className?: string;
    Icon?: React.ReactNode;
    triggerClassName?: string;
    triggerComponent?: React.ReactNode;
}
const HoverCardToolTip = ({
    side,
    align,
    label,
    children,
    className,
    Icon,
    triggerClassName,
    triggerComponent,
}: HoverCardToolTipProps) => {
    return (
        <HoverCard openDelay={50}>
            <HoverCardTrigger
                className={cn("text-blue-900 cursor-pointer w-min text-nowrap capitalize",
                    !Icon && !triggerComponent && "border-dashed border-b border-blue-600 underline-offset-1",
                    triggerClassName
                )}
            >
                {triggerComponent || label}{Icon}
            </HoverCardTrigger>
            <HoverCardContent side={side} align={align} className={className}>
                {children}
            </HoverCardContent>
        </HoverCard>
    );
};

export default HoverCardToolTip;
