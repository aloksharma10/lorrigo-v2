import { Card, CardContent } from '@lorrigo/ui/components';
import { Skeleton } from '@lorrigo/ui/components';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function MetricCard({
  title,
  value,
  description,
  isLoading = false,
  className = '',
  valueClassName = 'text-2xl font-bold',
  titleClassName = 'text-sm text-muted-foreground',
  descriptionClassName = 'text-xs text-muted-foreground mt-1',
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          {description && <Skeleton className="mt-2 h-3 w-32" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className={titleClassName}>{title}</div>
        <div className={valueClassName}>{value}</div>
        {description && <div className={descriptionClassName}>{description}</div>}
      </CardContent>
    </Card>
  );
}
