import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@lorrigo/ui/components';

interface ChannelCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  headerClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Factory component for creating consistent channel cards
 */
export function ChannelCard({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  headerClassName = 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50',
  children,
  footer,
}: ChannelCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${headerClassName} border-b`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="pt-6">{children}</CardContent>

      {footer && <CardFooter className="bg-muted/50 flex justify-between border-t px-6 py-4">{footer}</CardFooter>}
    </Card>
  );
}
