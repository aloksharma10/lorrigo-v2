"use client"

import { RadioGroup, RadioGroupItem, Label, Form, FormControl, FormField, FormItem, FormMessage } from "@lorrigo/ui/components"
import { Info } from "lucide-react"
import { useForm } from "react-hook-form"

// Create explicit interface for form values
interface PaymentFormValues {
  paymentMethod: "cod" | "prepaid";
}

export function PaymentMethodSelector() {
  const form = useForm<PaymentFormValues>({
    defaultValues: {
      paymentMethod: "cod",
    },
  })

  function onSubmit(values: PaymentFormValues) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
