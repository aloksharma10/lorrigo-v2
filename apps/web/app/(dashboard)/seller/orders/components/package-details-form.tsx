"use client"

import { useState, useEffect } from "react"
import { Info, LightbulbIcon } from "lucide-react"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Label, Alert, AlertDescription, Badge, Button } from "@lorrigo/ui/components"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const packageFormSchema = z.object({
  deadWeight: z.string().min(1, { message: "Dead weight is required" }),
  length: z.string().min(1, { message: "Length is required" }),
  breadth: z.string().min(1, { message: "Breadth is required" }),
  height: z.string().min(1, { message: "Height is required" }),
  volumetricWeight: z.string(),
})

export function PackageDetailsForm() {
  const [applicableWeight, setApplicableWeight] = useState("0")

  const form = useForm<z.infer<typeof packageFormSchema>>({
    resolver: zodResolver(packageFormSchema),
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

  function onSubmit(values: z.infer<typeof packageFormSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <LightbulbIcon className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-700">
            Tip: Add correct values to avoid weight discrepancy
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="deadWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Dead Weight
                  <span className="block text-xs text-muted-foreground">Physical weight of a package</span>
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input {...field} className="rounded-r-none" />
                  </FormControl>
                  <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
                    kg
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Note: Minimum chargeable wt is 0.5 kg</p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <Label className="text-sm font-medium">
              Package Dimensions
              <span className="block text-xs text-muted-foreground">LxBxH of the complete package</span>
            </Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex">
                      <FormControl>
                        <Input placeholder="Length" {...field} className="rounded-r-none" />
                      </FormControl>
                      <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
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
                      <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
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
                      <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
                        cm
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Note: Value should be greater than 0.50 cm</p>
          </div>

          <FormField
            control={form.control}
            name="volumetricWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  Volumetric Weight
                  <Info className="h-4 w-4 text-muted-foreground" />
                </FormLabel>
                <div className="flex">
                  <FormControl>
                    <Input {...field} readOnly className="rounded-r-none bg-muted" />
                  </FormControl>
                  <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
                    kg
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              Applicable Weight: {applicableWeight} kg
            </Badge>
          </div>
          <p className="mt-2 text-sm text-green-700">
            Applicable weight is the higher of the dead weight or volumetric weight, used by the courier for freight
            charges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Pack like a Pro - </span>
          <Button variant="link" className="h-auto p-0 text-indigo-600">
            Guidelines for Packaging and Measuring
          </Button>
          <Button variant="link" className="h-auto p-0 ml-auto text-indigo-600">
            See Guidelines
          </Button>
        </div>
      </form>
    </Form>
  )
}
