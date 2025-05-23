import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
} from '@lorrigo/ui/components';
import { CircleHelp, ExternalLink } from 'lucide-react';

interface ChartCardProps {
  title: string;
  badge?: string;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  onExternalLinkClick?: () => void;
}

export function ChartCard({
  title,
  badge,
  helpText,
  children,
  className,
  isLoading = false,
  onExternalLinkClick,
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">
            {isLoading ? <Skeleton className="h-4 w-32" /> : title}
          </CardTitle>
          {badge && !isLoading && (
            <Badge variant="outline" className="text-xs">
              {badge}
            </Badge>
          )}
          {helpText && !isLoading && <CircleHelp className="text-muted-foreground h-4 w-4" />}
        </div>
        {onExternalLinkClick && !isLoading && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExternalLinkClick}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
