"use client"

import { RadioGroup, RadioGroupItem, Label } from "@lorrigo/ui/components"
import { Info } from "lucide-react"

export function PaymentMethodSelector() {
  return (
    <RadioGroup defaultValue="cod" className="flex gap-4">
      <div className="flex items-center space-x-2 border rounded-md p-4">
        <RadioGroupItem value="cod" id="cod" />
        <Label htmlFor="cod" className="flex items-center gap-2">
          Cash on Delivery
          <Info className="h-4 w-4 text-muted-foreground" />
        </Label>
      </div>
      <div className="flex items-center space-x-2 border rounded-md p-4">
        <RadioGroupItem value="prepaid" id="prepaid" />
        <Label htmlFor="prepaid" className="flex items-center gap-2">
          Prepaid
          <Info className="h-4 w-4 text-muted-foreground" />
        </Label>
      </div>
    </RadioGroup>
  )
}
