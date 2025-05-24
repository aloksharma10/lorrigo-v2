"use client"

import {
  RadioGroup,
  RadioGroupItem,
  Label,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@lorrigo/ui/components"
import { Info } from "lucide-react"
import { useForm } from "react-hook-form"
import { useEffect } from "react"

// Create explicit interface for form values
interface PaymentFormValues {
  paymentMethod: "cod" | "prepaid"
}

interface PaymentMethodSelectorProps {
  onSubmit: (values: PaymentFormValues) => void
  error?: string
}

export function PaymentMethodSelector({ onSubmit, error }: PaymentMethodSelectorProps) {
  const form = useForm<PaymentFormValues>({
    defaultValues: {
      paymentMethod: "prepaid",
    },
  })

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as PaymentFormValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onSubmit])

  // Add this effect to handle error passed from parent
  useEffect(() => {
    if (error) {
      form.setError("paymentMethod", {
        type: "manual",
        message: error,
      })
    }
  }, [error, form])

  function handleSubmit(values: PaymentFormValues) {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <RadioGroupItem value="prepaid" id="prepaid" />
                    <Label htmlFor="prepaid" className="flex items-center gap-2">
                      Prepaid
                      <Info className="text-muted-foreground h-4 w-4" />
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-2">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center gap-2">
                      Cash on Delivery
                      <Info className="text-muted-foreground h-4 w-4" />
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
