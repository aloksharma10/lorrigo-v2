"use client"

import { Plus, Truck, AlertCircle } from "lucide-react"
import { Button, Badge, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@lorrigo/ui/components"
import type { Courier } from "../types/shipping-plan"

interface CourierSelectorProps {
  availableCouriers: Courier[]
  onSelectCourier: (courierId: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CourierSelector({ availableCouriers, onSelectCourier, open, onOpenChange }: CourierSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
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
          <DialogDescription>Choose a courier to add pricing configuration</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {availableCouriers.map((courier) => (
            <Button
              key={courier.id}
              variant="ghost"
              className="w-full justify-start hover:bg-primary/10"
              onClick={() => {
                onSelectCourier(courier.id)
                onOpenChange(false)
              }}
            >
              <Truck className="mr-2 h-4 w-4" />
              {courier.name}
              <Badge variant="secondary" className="ml-auto">
                {courier.code}
              </Badge>
            </Button>
          ))}
          {availableCouriers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-8 w-8 mb-2" />
              <p>All couriers have been added</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
