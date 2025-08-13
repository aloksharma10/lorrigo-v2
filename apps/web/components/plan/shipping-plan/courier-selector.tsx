'use client';

import { useState } from 'react';
import { Plus, Truck, AlertCircle, Search, Check } from 'lucide-react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Checkbox,
  ScrollArea,
} from '@lorrigo/ui/components';
import type { Courier } from '../types/shipping-plan';

interface CourierSelectorProps {
  availableCouriers: Courier[];
  onSelectCourier: (courierId: string) => void;
  onSelectMultipleCouriers: (courierIds: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourierSelector({ availableCouriers, onSelectCourier, onSelectMultipleCouriers, open, onOpenChange }: CourierSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([]);

  const filteredCouriers = availableCouriers.filter(
    (courier) => courier.name.toLowerCase().includes(searchQuery.toLowerCase()) || courier?.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleCourier = (courierId: string) => {
    setSelectedCouriers((prev) => (prev.includes(courierId) ? prev.filter((id) => id !== courierId) : [...prev, courierId]));
  };

  const handleAddMultipleCouriers = () => {
    if (selectedCouriers.length > 0) {
      onSelectMultipleCouriers(selectedCouriers);
      setSelectedCouriers([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="from-primary to-primary/90 hover:from-primary/90 hover:to-primary bg-gradient-to-r">
          <Plus className="mr-2 h-4 w-4" />
          Add Courier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>Select Courier</span>
          </DialogTitle>
          <DialogDescription>Choose one or multiple couriers to add pricing configuration</DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
          <Input placeholder="Search couriers..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <ScrollArea className="max-h-60">
          <div className="space-y-2">
            {filteredCouriers.map((courier) => (
              <div
                key={courier.id}
                className="hover:bg-primary/10 flex cursor-pointer items-center space-x-2 rounded-md p-2"
                onClick={() => handleToggleCourier(courier.id)}
              >
                <Checkbox checked={selectedCouriers.includes(courier.id)} />
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4" />
                    {/* @ts-ignore */}
                    <span>{courier.name} ({courier.channel_config?.nickname})</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {courier.code}
                  </Badge>
                </div>
              </div>
            ))}
            {filteredCouriers.length === 0 && (
              <div className="text-muted-foreground py-8 text-center">
                <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                <p>{searchQuery ? 'No couriers match your search' : 'All couriers have been added'}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 flex justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCouriers([]);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <div className="flex items-center space-x-2">
            {selectedCouriers.length > 0 && <span className="text-muted-foreground text-sm">{selectedCouriers.length} selected</span>}
            <Button onClick={handleAddMultipleCouriers} disabled={selectedCouriers.length === 0}>
              <Check className="mr-2 h-4 w-4" />
              Add Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
