import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@lorrigo/ui/components';
import { IconProps } from '@tabler/icons-react';
import { Badge } from '@lorrigo/ui/components';
import ActionTooltip from './action-tooltip';
import { ComponentType, ForwardRefExoticComponent, RefAttributes } from 'react';
import { LucideProps } from 'lucide-react';

interface CardItemsProps {
  title: string;
  value: string;
  percentage?: string;
  description: string;
  icon:
    | ComponentType<IconProps>
    | ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;
}

export function CardItems({ title, value, percentage, description, icon: Icon }: CardItemsProps) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div>
            <CardDescription className="flex items-center gap-2">
              <span className="text-sm md:text-base lg:text-base">{title}</span>
              <ActionTooltip label={description}>
                <Icon className="size-6" />
              </ActionTooltip>
            </CardDescription>
            <CardTitle className="@[250px]/card:text-2xl flex items-center gap-2 text-2xl font-semibold tabular-nums">
              {value}
            </CardTitle>
          </div>
        </div>
        {percentage && (
          <CardAction>
            <Badge variant={'outline'}>
              <Icon className="size-4" />
              {percentage}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {/* <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
               {description} <IconTrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
               {description}
            </div>
         </CardFooter> */}
    </Card>
  );
}
