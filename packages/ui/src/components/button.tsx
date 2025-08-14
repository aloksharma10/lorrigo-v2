import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import { Loader2Icon, LucideProps } from 'lucide-react';
import { RefAttributes } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer dark:bg-primary/90 dark:hover:bg-primary/80',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  icon?: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
  tooltipLabel?: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  tooltipAlign?: 'start' | 'center' | 'end';
  tooltipDelayDuration?: number;
  tooltipDisabled?: boolean;
  tooltipIcon?: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
  iconProps?: LucideProps;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      icon: Icon,
      children,
      isLoading,
      tooltipLabel,
      tooltipSide = 'top',
      tooltipAlign = 'center',
      tooltipDelayDuration = 700,
      tooltipDisabled = false,
      disabled,
      tooltipIcon: TooltipIcon,
      iconProps,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    const buttonElement = (
      <Comp
        ref={ref}
        type={!asChild ? 'button' : undefined}
        data-slot="button"
        className={cn('cursor-pointer', buttonVariants({ variant, size, className }), isLoading && 'cursor-wait', Icon && 'gap-2')}
        disabled={disabled || isLoading}
        {...props}
      >
        <span className="flex items-center gap-2">
          {isLoading && <Loader2Icon className="animate-spin" />}
          {Icon && !isLoading && <Icon {...iconProps} className={cn('h-4 w-4', iconProps?.className)} />}
          {children}
        </span>
      </Comp>
    );

    // If no tooltip label is provided, return the button without tooltip
    if (!tooltipLabel || tooltipDisabled) {
      return buttonElement;
    }

    // Wrap with tooltip when tooltipLabel is provided
    return (
      <TooltipProvider>
        <Tooltip delayDuration={tooltipDelayDuration}>
          <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
          <TooltipContent side={tooltipSide} align={tooltipAlign}>
            <p className="flex items-center gap-2">
              {TooltipIcon && <TooltipIcon className={cn('h-4 w-4')} />}
              {tooltipLabel}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
