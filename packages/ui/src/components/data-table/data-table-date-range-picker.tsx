'use client';

import React from 'react';

import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Button } from '../button';
import { Calendar } from '../calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { cn } from '@lorrigo/ui/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';

interface DataTableDateRangePickerProps {
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
  className?: string;
  disabled?: boolean;
}

export function DataTableDateRangePicker({
  dateRange,
  setDateRange,
  className,
  disabled = false,
}: DataTableDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open && !disabled} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            size="sm"
            className={cn(
              'h-9 justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                </>
              ) : (
                format(dateRange.from, 'dd/MM/yyyy')
              )
            ) : (
              <span>Last 30 days</span>
            )}
            {disabled && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(range) => {
              if (range) {
                setDateRange(range);
                // setOpen(false);
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
