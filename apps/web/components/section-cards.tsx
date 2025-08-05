import { Card, CardHeader, CardTitle } from '@lorrigo/ui/components/card';
import { CardItems } from '@/components/card-items';
import { IconProps } from '@tabler/icons-react';
import { FC, ComponentType } from 'react';
import { cn } from '@lorrigo/ui/lib/utils';

export interface CardItemData {
  title: string;
  value: string;
  percentage?: string;
  description: string;
  icon: ComponentType<IconProps>;
  className?: string;
}

export interface SectionCardsProps {
  title: string;
  items: CardItemData[];
  className: string;
  gridClassName?: string;
}

export const SectionCards: FC<SectionCardsProps> = ({ title, items = [], className = '', gridClassName = '' }) => {
  return (
    <Card className={cn('p-4', className)}>
      <CardHeader>
        <CardTitle className="scroll-m-20 text-lg font-semibold tracking-tight md:text-xl">{title}</CardTitle>
      </CardHeader>
      <div
        className={`*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t lg:px-6 ${gridClassName}`}
      >
        {items.map((item, index) => (
          <CardItems
            className={item.className}
            key={index}
            title={item.title}
            value={item.value}
            percentage={item.percentage}
            description={item.description}
            icon={item.icon}
          />
        ))}
      </div>
    </Card>
  );
};
