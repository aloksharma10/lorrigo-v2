"use client"

import { useState } from "react"
import { Info, LightbulbIcon } from "lucide-react"

import { Input, Label, Alert, AlertDescription, Badge, Button } from "@lorrigo/ui/components"

export function PackageDetailsForm() {
  const [deadWeight, setDeadWeight] = useState("0.00")
  const [length, setLength] = useState("")
  const [breadth, setBreadth] = useState("")
  const [height, setHeight] = useState("")
  const [volumetricWeight, setVolumetricWeight] = useState("0")
  const [applicableWeight, setApplicableWeight] = useState("0")

  // Calculate volumetric weight when dimensions change
  const calculateVolumetricWeight = () => {
    if (length && breadth && height) {
      const l = Number.parseFloat(length)
      const b = Number.parseFloat(breadth)
      const h = Number.parseFloat(height)
      if (l > 0 && b > 0 && h > 0) {
        const volumetric = (l * b * h) / 5000
        setVolumetricWeight(volumetric.toFixed(2))

        // Update applicable weight (higher of dead weight and volumetric)
        const dead = Number.parseFloat(deadWeight)
        setApplicableWeight(Math.max(dead, volumetric).toFixed(2))
      }
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-blue-50 border-blue-200">
        <LightbulbIcon className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700">
          Tip: Add correct values to avoid weight discrepancy
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="dead-weight" className="text-sm font-medium">
            Dead Weight
            <span className="block text-xs text-muted-foreground">Physical weight of a package</span>
          </Label>
          <div className="flex mt-1">
            <Input
              id="dead-weight"
              type="text"
              value={deadWeight}
              onChange={(e) => {
                setDeadWeight(e.target.value)
                // Recalculate applicable weight
                const dead = Number.parseFloat(e.target.value) || 0
                const vol = Number.parseFloat(volumetricWeight) || 0
                setApplicableWeight(Math.max(dead, vol).toFixed(2))
              }}
              className="rounded-r-none"
            />
            <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">kg</div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Note: Minimum chargeable wt is 0.5 kg</p>
        </div>

        <div className="md:col-span-2">
          <Label className="text-sm font-medium">
            Package Dimensions
            <span className="block text-xs text-muted-foreground">LxBxH of the complete package</span>
          </Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="flex">
              <Input
                placeholder="Length"
                value={length}
                onChange={(e) => {
                  setLength(e.target.value)
                  calculateVolumetricWeight()
                }}
                className="rounded-r-none"
              />
              <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
                cm
              </div>
            </div>
            <div className="flex">
              <Input
                placeholder="Breadth"
                value={breadth}
                onChange={(e) => {
                  setBreadth(e.target.value)
                  calculateVolumetricWeight()
                }}
                className="rounded-r-none"
              />
              <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
                cm
              </div>
            </div>
            <div className="flex">
              <Input
                placeholder="Height"
                value={height}
                onChange={(e) => {
                  setHeight(e.target.value)
                  calculateVolumetricWeight()
                }}
                className="rounded-r-none"
              />
              <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">
                cm
              </div>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Note: Value should be greater than 0.50 cm</p>
        </div>

        <div>
          <Label htmlFor="volumetric-weight" className="text-sm font-medium flex items-center gap-1">
            Volumetric Weight
            <Info className="h-4 w-4 text-muted-foreground" />
          </Label>
          <div className="flex mt-1">
            <Input
              id="volumetric-weight"
              type="text"
              value={volumetricWeight}
              readOnly
              className="rounded-r-none bg-muted"
            />
            <div className="flex items-center justify-center h-10 px-3 border border-l-0 rounded-r-md bg-muted">kg</div>
          </div>
        </div>
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
    </div>
  )
}
