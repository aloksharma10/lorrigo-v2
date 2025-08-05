'use client';

import type * as React from 'react';
import { Button } from '../button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../dropdown-menu';
import { ChevronDown } from 'lucide-react';

interface BulkAction<TData> {
  label: string;
  action: (selectedRows: TData[]) => void;
  icon?: React.ReactNode;
}

interface DataTableBulkActionsMenuProps<TData> {
  selectedRows: TData[];
  actions: BulkAction<TData>[];
}

export function DataTableBulkActionsMenu<TData>({ selectedRows, actions }: DataTableBulkActionsMenuProps<TData>) {
  if (!selectedRows.length || !actions.length) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          Bulk Actions
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, index) => (
          <DropdownMenuItem key={index} onClick={() => action.action(selectedRows)}>
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
