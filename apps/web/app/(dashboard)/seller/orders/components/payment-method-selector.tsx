"use client"

import { RadioGroup, RadioGroupItem, Label, Form, FormControl, FormField, FormItem, FormMessage } from "@lorrigo/ui/components"
import { Info } from "lucide-react"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"


const paymentFormSchema = z.object({
  paymentMethod: z.enum(["cod", "prepaid"], {
    required_error: "Please select a payment method",
  }),
})

export function PaymentMethodSelector() {
  const form = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentMethod: "cod",
    },
  })

  function onSubmit(values: z.infer<typeof paymentFormSchema>) {
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
