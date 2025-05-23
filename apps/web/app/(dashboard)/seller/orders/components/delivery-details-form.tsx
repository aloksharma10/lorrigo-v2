"use client"

import { Checkbox, Input, Label } from "@lorrigo/ui/components"

interface DeliveryDetailsFormProps {
  isBusiness: boolean
  onBusinessChange: (value: boolean) => void
  billingIsSameAsDelivery: boolean
  onBillingIsSameChange: (value: boolean) => void
}

export function DeliveryDetailsForm({
  isBusiness,
  onBusinessChange,
  billingIsSameAsDelivery,
  onBillingIsSameChange,
}: DeliveryDetailsFormProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-business"
          checked={isBusiness}
          onCheckedChange={(checked) => onBusinessChange(checked as boolean)}
        />
        <Label htmlFor="is-business">This is a B2B Order</Label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="mobile-number" className="text-sm font-medium">
            Mobile Number
          </Label>
          <div className="flex mt-1">
            <div className="flex items-center justify-center h-10 px-3 border rounded-l-md bg-muted">+91</div>
            <Input id="mobile-number" placeholder="Enter mobile number" className="rounded-l-none" />
          </div>
        </div>

        <div>
          <Label htmlFor="full-name" className="text-sm font-medium">
            Full Name
          </Label>
          <Input id="full-name" placeholder="Enter Full Name" className="mt-1" />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="complete-address" className="text-sm font-medium">
            Complete Address
          </Label>
          <Input id="complete-address" placeholder="Enter Buyer's full address" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="landmark" className="text-sm font-medium flex items-center gap-1">
            Landmark
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input id="landmark" placeholder="Enter any near by landmark" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="pincode" className="text-sm font-medium">
            Pincode
          </Label>
          <Input id="pincode" placeholder="Enter pincode" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="city" className="text-sm font-medium">
            City
          </Label>
          <Input id="city" placeholder="City" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="state" className="text-sm font-medium">
            State
          </Label>
          <Input id="state" placeholder="State" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="alt-mobile" className="text-sm font-medium flex items-center gap-1">
            Alternate Mobile Number
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <div className="flex mt-1">
            <div className="flex items-center justify-center h-10 px-3 border rounded-l-md bg-muted">+91</div>
            <Input id="alt-mobile" placeholder="Enter mobile number" className="rounded-l-none" />
          </div>
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
            Email Id
            <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Input id="email" placeholder="Enter Email Address" className="mt-1" />
        </div>
      </div>

      <div className="flex items-center space-x-2 pt-4">
        <Checkbox
          id="billing-same"
          checked={billingIsSameAsDelivery}
          onCheckedChange={(checked) => onBillingIsSameChange(checked as boolean)}
        />
        <Label htmlFor="billing-same">Billing Details are same as Delivery Details</Label>
      </div>
    </div>
  )
}
