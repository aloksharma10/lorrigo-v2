'use client';

import type * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { ExternalLink } from 'lucide-react';
import { Badge } from './badge';
import { Skeleton } from './skeleton';
import { CircleHelp } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (value: any, row: T) => React.ReactNode;
}

interface SimpleDataTableProps<T> {
  title: string;
  description?: string;
  badge?: string;
  helpText?: string;
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onExternalLinkClick?: () => void;
}

export function SimpleDataTable<T>({ title, description, badge, helpText, columns, data, isLoading = false, onExternalLinkClick }: SimpleDataTableProps<T>) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
            {badge && <Skeleton className="h-5 w-24" />}
          </div>
          <Skeleton className="h-8 w-8" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {badge && (
            <Badge variant="outline" className="text-xs">
              {badge}
            </Badge>
          )}
          {helpText && <CircleHelp className="text-muted-foreground h-4 w-4" />}
        </div>
        {onExternalLinkClick && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExternalLinkClick}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={String(column.accessorKey)}>{column.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={String(column.accessorKey)}>
                      {column.cell ? column.cell(row[column.accessorKey], row) : String(row[column.accessorKey])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {description && <div className="text-muted-foreground mt-4 text-sm">{description}</div>}
      </CardContent>
    </Card>
  );
}
