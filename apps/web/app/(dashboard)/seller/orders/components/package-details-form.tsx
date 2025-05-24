"use client"

import { useState, useEffect } from "react"
import { Info, LightbulbIcon } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  Alert,
  AlertDescription,
  Badge,
  Button,
} from "@lorrigo/ui/components"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { type PackageFormValues, packageDetailsSchema } from "../types"

interface PackageDetailsFormProps {
  onSubmit: (values: PackageFormValues) => void
  errors?: Record<string, any>
}

export function PackageDetailsForm({ onSubmit, errors }: PackageDetailsFormProps) {
  const [applicableWeight, setApplicableWeight] = useState("0")

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageDetailsSchema),
    defaultValues: {
      deadWeight: "0.00",
      length: "",
      breadth: "",
      height: "",
      volumetricWeight: "0",
    },
  })

  // Calculate volumetric weight when dimensions change
  const watchedDimensions = form.watch(["length", "breadth", "height", "deadWeight"])

  useEffect(() => {
    const [length, breadth, height, deadWeight] = watchedDimensions

    if (length && breadth && height) {
      const l = Number.parseFloat(length)
      const b = Number.parseFloat(breadth)
      const h = Number.parseFloat(height)
      if (l > 0 && b > 0 && h > 0) {
        const volumetric = (l * b * h) / 5000
        form.setValue("volumetricWeight", volumetric.toFixed(2))

        // Update applicable weight (higher of dead weight and volumetric)
        const dead = Number.parseFloat(deadWeight) || 0
        setApplicableWeight(Math.max(dead, volumetric).toFixed(2))
      }
    }
  }, [watchedDimensions, form])

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((value) => {
      onSubmit(value as PackageFormValues)
    })
    return () => subscription.unsubscribe()
  }, [form, onSubmit])

  // Add this effect to handle errors passed from parent
  useEffect(() => {
    if (errors) {
      Object.entries(errors).forEach(([key, value]) => {
        if (value && typeof value === "object" && "message" in value) {
          form.setError(key as any, {
            type: "manual",
            message: value.message as string,
          })
        }
      })
    }
  }, [errors, form])

  function handleSubmit(values: PackageFormValues) {
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <LightbulbIcon className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            Tip: Add correct values to avoid weight discrepancy
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="deadWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Dead Weight
                  <span className="text-muted-foreground block text-xs">Physical weight of a package</span>
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input {...field} className="rounded-r-none" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-3">
                    kg
                  </div>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">Note: Minimum chargeable wt is 0.5 kg</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <Label className="text-sm font-medium">
              Package Dimensions
              <span className="text-muted-foreground block text-xs">LxBxH of the complete package</span>
            </Label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex">
                      <FormControl>
                        <Input placeholder="Length" {...field} className="rounded-r-none" />
                      </FormControl>
                      <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-3">
                        cm
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breadth"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex">
                      <FormControl>
                        <Input placeholder="Breadth" {...field} className="rounded-r-none" />
                      </FormControl>
                      <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-3">
                        cm
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex">
                      <FormControl>
                        <Input placeholder="Height" {...field} className="rounded-r-none" />
                      </FormControl>
                      <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-3">
                        cm
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Note: Value should be greater than 0.50 cm</p>
          </div>

          <FormField
            control={form.control}
            name="volumetricWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1 text-sm font-medium">
                  Volumetric Weight
                  <Info className="text-muted-foreground h-4 w-4" />
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted rounded-r-none" />
                  </FormControl>
                  <div className="bg-muted flex items-center justify-center rounded-r-md border border-l-0 px-3">
                    kg
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">
              Applicable Weight: {applicableWeight} kg
            </Badge>
          </div>
          <p className="mt-2 text-sm text-green-700">
            Applicable weight is the higher of the dead weight or volumetric weight, used by the courier for freight
            charges.
          </p>
        </div>

      </form>
    </Form>
  )
}
