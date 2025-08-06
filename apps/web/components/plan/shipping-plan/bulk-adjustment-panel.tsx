'use client';

import { useState } from 'react';
import { TrendingUp, Percent, Zap, RotateCcw, Users, Loader2, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Button, Card, CardHeader, Input, Badge, Alert, AlertDescription } from '@lorrigo/ui/components';
import { Info } from 'lucide-react';
import type { Courier } from '../types/shipping-plan';

interface BulkAdjustmentPanelProps {
  selectedCourierIndices: Set<number>;
  selectedCouriers: Array<{ courier?: Courier; index: number }>;
  hasUnsavedChanges: boolean;
  onApplyBulkAdjustment: (percent: number) => void;
  onResetPricing: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  isApplying: boolean;
}

export function BulkAdjustmentPanel({
  selectedCourierIndices,
  selectedCouriers,
  hasUnsavedChanges,
  onApplyBulkAdjustment,
  onResetPricing,
  onSelectAll,
  onDeselectAll,
  onExpandAll,
  onCollapseAll,
  isApplying,
}: BulkAdjustmentPanelProps) {
  const [bulkAdjustmentPercent, setBulkAdjustmentPercent] = useState(0);

  const handleApply = () => {
    onApplyBulkAdjustment(bulkAdjustmentPercent);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="from-secondary to-secondary/80 text-secondary-foreground rounded-t-lg bg-gradient-to-r">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-background/20 rounded-lg p-2 backdrop-blur-sm">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Selective Price Adjustment</h3>
              <p className="text-secondary-foreground/80 text-sm">Select couriers and apply percentage changes to their pricing</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandAll}
                className="bg-background/20 border-background/30 text-secondary-foreground hover:bg-background/30"
              >
                <ChevronDownIcon className="mr-1 h-3 w-3" />
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCollapseAll}
                className="bg-background/20 border-background/30 text-secondary-foreground hover:bg-background/30"
              >
                <ChevronUpIcon className="mr-1 h-3 w-3" />
                Collapse All
              </Button>
            </div>
            <div className="bg-background/20 flex items-center space-x-2 rounded-lg px-3 py-2 backdrop-blur-sm">
              <Percent className="h-4 w-4" />
              <Input
                type="number"
                placeholder="0"
                value={bulkAdjustmentPercent}
                onChange={(e) => setBulkAdjustmentPercent(Number(e.target.value))}
                min="-100"
                max="1000"
              />
            </div>
            <Button onClick={handleApply} disabled={isApplying || selectedCourierIndices.size === 0} className="font-semibold">
              {isApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Apply to Selected ({selectedCourierIndices.size})
            </Button>
            {hasUnsavedChanges && (
              <Button onClick={onResetPricing} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Selection Controls */}
      {selectedCouriers.length > 0 && (
        <div className="bg-secondary/10 dark:bg-secondary/5 border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="text-secondary h-4 w-4" />
                <span className="text-sm font-medium">
                  Courier Selection ({selectedCourierIndices.size} of {selectedCouriers.length} selected)
                </span>
              </div>
              {selectedCourierIndices.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Array.from(selectedCourierIndices).map((index) => (
                    <Badge key={index} variant="secondary">
                      {selectedCouriers[index]?.courier?.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={onSelectAll} className="border-secondary/20 hover:bg-secondary/10">
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={onDeselectAll} className="border-secondary/20 hover:bg-secondary/10">
                Deselect All
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="border-b px-2">
          <Alert className="bg-amber-200 dark:bg-amber-950/20">
            <Info className="h-4 w-4" />
            <AlertDescription>You have unsaved pricing changes. Don't forget to save your plan or reset to original values.</AlertDescription>
          </Alert>
        </div>
      )}
    </Card>
  );
}
