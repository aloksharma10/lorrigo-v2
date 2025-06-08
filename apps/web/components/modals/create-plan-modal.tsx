"use client"

import type React from "react"
import { toast, Button, Input, Label, Textarea, Switch } from "@lorrigo/ui/components"
import { X, Plus, Trash2, Loader2 } from "lucide-react"
import { useState } from "react"
import { usePlanOperations } from "@/lib/apis/plans"
import { useCourierOperations } from "@/lib/apis/couriers"

interface Courier {
  id: string
  name: string
  code: string
  is_active: boolean
}

interface ZonePricing {
  base_price: number
  is_fw_applicable?: boolean
  increment_price: number
  is_rto_same_as_fw: boolean
  rto_base_price: number
  rto_increment_price: number
  flat_rto_charge: number
}

interface CourierPricing {
  courierId: string
  cod_charge_hard: number
  cod_charge_percent: number
  is_fw_applicable: boolean
  is_rto_applicable: boolean
  is_cod_applicable: boolean
  is_cod_reversal_applicable: boolean
  weight_slab: number
  increment_weight: number
  increment_price: number
  zonePricing: {
    withinCity: ZonePricing
    withinZone: ZonePricing
    withinMetro: ZonePricing
    withinRoi: ZonePricing
    northEast: ZonePricing
  }
}

interface FormData {
  name: string
  description: string
  isDefault: boolean
  features: string[]
  courierPricing: CourierPricing[]
}

interface CreatePlanModalProps {
  onClose: () => void
}

export function CreatePlanModal({ onClose }: CreatePlanModalProps) {
  const { createPlan } = usePlanOperations()
  const { getCouriersQuery } = useCourierOperations()

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    isDefault: false,
    features: [""],
    courierPricing: [
      {
        courierId: "",
        cod_charge_hard: 0,
        cod_charge_percent: 0,
        is_fw_applicable: true,
        is_rto_applicable: false,
        is_cod_applicable: true,
        is_cod_reversal_applicable: true,
        weight_slab: 0.5,
        increment_weight: 0.5,
        increment_price: 0,
        zonePricing: {
          withinCity: {
            base_price: 0,
            is_fw_applicable: false,
            increment_price: 0,
            is_rto_same_as_fw: true,
            rto_base_price: 0,
            rto_increment_price: 0,
            flat_rto_charge: 0,
          },
          withinZone: {
            base_price: 0,
            increment_price: 0,
            is_rto_same_as_fw: false,
            rto_base_price: 0,
            rto_increment_price: 0,
            flat_rto_charge: 0,
          },
          withinMetro: {
            base_price: 0,
            increment_price: 0,
            is_rto_same_as_fw: true,
            rto_base_price: 0,
            rto_increment_price: 0,
            flat_rto_charge: 0,
          },
          withinRoi: {
            base_price: 0,
            increment_price: 0,
            is_rto_same_as_fw: false,
            rto_base_price: 0,
            rto_increment_price: 0,
            flat_rto_charge: 0,
          },
          northEast: {
            base_price: 0,
            increment_price: 0,
            is_rto_same_as_fw: true,
            rto_base_price: 0,
            rto_increment_price: 0,
            flat_rto_charge: 0,
          },
        },
      },
    ],
  })

  // Use cached data - no unnecessary refetch calls
  const couriers: Courier[] = getCouriersQuery.data || []
  const isLoadingCouriers = getCouriersQuery.isLoading
  const isCreating = createPlan.isPending

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, ""],
    }))
  }

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  const updateFeature = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((feature, i) => (i === index ? value : feature)),
    }))
  }

  const addCourierPricing = () => {
    setFormData((prev) => ({
      ...prev,
      courierPricing: [
        ...prev.courierPricing,
        {
          courierId: "",
          cod_charge_hard: 0,
          cod_charge_percent: 0,
          is_fw_applicable: true,
          is_rto_applicable: false,
          is_cod_applicable: true,
          is_cod_reversal_applicable: true,
          weight_slab: 0.5,
          increment_weight: 0.5,
          increment_price: 0,
          zonePricing: {
            withinCity: {
              base_price: 0,
              is_fw_applicable: false,
              increment_price: 0,
              is_rto_same_as_fw: true,
              rto_base_price: 0,
              rto_increment_price: 0,
              flat_rto_charge: 0,
            },
            withinZone: {
              base_price: 0,
              increment_price: 0,
              is_rto_same_as_fw: false,
              rto_base_price: 0,
              rto_increment_price: 0,
              flat_rto_charge: 0,
            },
            withinMetro: {
              base_price: 0,
              increment_price: 0,
              is_rto_same_as_fw: true,
              rto_base_price: 0,
              rto_increment_price: 0,
              flat_rto_charge: 0,
            },
            withinRoi: {
              base_price: 0,
              increment_price: 0,
              is_rto_same_as_fw: false,
              rto_base_price: 0,
              rto_increment_price: 0,
              flat_rto_charge: 0,
            },
            northEast: {
              base_price: 0,
              increment_price: 0,
              is_rto_same_as_fw: true,
              rto_base_price: 0,
              rto_increment_price: 0,
              flat_rto_charge: 0,
            },
          },
        },
      ],
    }))
  }

  const removeCourierPricing = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      courierPricing: prev.courierPricing.filter((_, i) => i !== index),
    }))
  }

  const updateCourierPricing = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      courierPricing: prev.courierPricing.map((courier, i) =>
        i === index ? { ...courier, [field]: value } : courier
      ),
    }))
  }

  const updateZonePricing = (courierIndex: number, zone: keyof CourierPricing["zonePricing"], field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      courierPricing: prev.courierPricing.map((courier, i) =>
        i === courierIndex
          ? {
              ...courier,
              zonePricing: {
                ...courier.zonePricing,
                [zone]: {
                  ...courier.zonePricing[zone],
                  [field]: value,
                },
              },
            }
          : courier
      ),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate courier pricing
    const hasValidCourier = formData.courierPricing.every(
      (courier) => courier.courierId && courier.courierId.trim() !== ""
    )
    if (!hasValidCourier) {
      toast.error("Please select a courier for all pricing entries")
      return
    }

    // Format payload to match API structure
    const payload = {
      name: formData.name,
      description: formData.description,
      isDefault: formData.isDefault,
      features: formData.features.filter((feature) => feature.trim() !== ""),
      courierPricing: formData.courierPricing.map((courier) => ({
        courierId: courier.courierId,
        cod_charge_hard: Number(courier.cod_charge_hard),
        cod_charge_percent: Number(courier.cod_charge_percent),
        is_fw_applicable: courier.is_fw_applicable,
        is_rto_applicable: courier.is_rto_applicable,
        is_cod_applicable: courier.is_cod_applicable,
        is_cod_reversal_applicable: courier.is_cod_reversal_applicable,
        weight_slab: Number(courier.weight_slab),
        increment_weight: Number(courier.increment_weight),
        increment_price: Number(courier.increment_price),
        zonePricing: {
          withinCity: {
            base_price: Number(courier.zonePricing.withinCity.base_price),
            is_fw_applicable: courier.zonePricing.withinCity.is_fw_applicable,
            increment_price: Number(courier.zonePricing.withinCity.increment_price),
            is_rto_same_as_fw: courier.zonePricing.withinCity.is_rto_same_as_fw,
            rto_base_price: Number(courier.zonePricing.withinCity.rto_base_price),
            rto_increment_price: Number(courier.zonePricing.withinCity.rto_increment_price),
            flat_rto_charge: Number(courier.zonePricing.withinCity.flat_rto_charge),
          },
          withinZone: {
            base_price: Number(courier.zonePricing.withinZone.base_price),
            increment_price: Number(courier.zonePricing.withinZone.increment_price),
            is_rto_same_as_fw: courier.zonePricing.withinZone.is_rto_same_as_fw,
            rto_base_price: Number(courier.zonePricing.withinZone.rto_base_price),
            rto_increment_price: Number(courier.zonePricing.withinZone.rto_increment_price),
            flat_rto_charge: Number(courier.zonePricing.withinZone.flat_rto_charge),
          },
          withinMetro: {
            base_price: Number(courier.zonePricing.withinMetro.base_price),
            increment_price: Number(courier.zonePricing.withinMetro.increment_price),
            is_rto_same_as_fw: courier.zonePricing.withinMetro.is_rto_same_as_fw,
            rto_base_price: Number(courier.zonePricing.withinMetro.rto_base_price),
            rto_increment_price: Number(courier.zonePricing.withinMetro.rto_increment_price),
            flat_rto_charge: Number(courier.zonePricing.withinMetro.flat_rto_charge),
          },
          withinRoi: {
            base_price: Number(courier.zonePricing.withinRoi.base_price),
            increment_price: Number(courier.zonePricing.withinRoi.increment_price),
            is_rto_same_as_fw: courier.zonePricing.withinRoi.is_rto_same_as_fw,
            rto_base_price: Number(courier.zonePricing.withinRoi.rto_base_price),
            rto_increment_price: Number(courier.zonePricing.withinRoi.rto_increment_price),
            flat_rto_charge: Number(courier.zonePricing.withinRoi.flat_rto_charge),
          },
          northEast: {
            base_price: Number(courier.zonePricing.northEast.base_price),
            increment_price: Number(courier.zonePricing.northEast.increment_price),
            is_rto_same_as_fw: courier.zonePricing.northEast.is_rto_same_as_fw,
            rto_base_price: Number(courier.zonePricing.northEast.rto_base_price),
            rto_increment_price: Number(courier.zonePricing.northEast.rto_increment_price),
            flat_rto_charge: Number(courier.zonePricing.northEast.flat_rto_charge),
          },
        },
      })),
    }

    try {
      await createPlan.mutateAsync(payload)
      toast.success("Plan created successfully")
      onClose()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create plan")
    }
  }

  return (
    <div className="flex flex-col p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Create New Plan</h2>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={isCreating}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isDefault: checked }))}
              disabled={isCreating}
            />
            <Label htmlFor="isDefault">Set as Default Plan</Label>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
            disabled={isCreating}
          />
        </div>

        <div>
          <Label>Features</Label>
          {formData.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2 mt-2">
              <Input
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                placeholder="Enter feature"
                disabled={isCreating}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeFeature(index)}
                disabled={formData.features.length === 1 || isCreating}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addFeature} className="mt-2" disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <div>
          <Label>Courier Pricing</Label>
          {formData.courierPricing.map((courier, index) => (
            <div key={index} className="border p-4 rounded-md mt-2 space-y-4">
              <div>
                <Label htmlFor={`courier-${index}`}>Select Courier</Label>
                <select
                  id={`courier-${index}`}
                  value={courier.courierId}
                  onChange={(e) => updateCourierPricing(index, "courierId", e.target.value)}
                  disabled={isCreating || isLoadingCouriers}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a courier</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`cod_charge_hard-${index}`}>COD Charge (Hard)</Label>
                  <Input
                    id={`cod_charge_hard-${index}`}
                    type="number"
                    value={courier.cod_charge_hard}
                    onChange={(e) => updateCourierPricing(index, "cod_charge_hard", e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor={`cod_charge_percent-${index}`}>COD Charge (%)</Label>
                  <Input
                    id={`cod_charge_percent-${index}`}
                    type="number"
                    value={courier.cod_charge_percent}
                    onChange={(e) => updateCourierPricing(index, "cod_charge_percent", e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`is_fw_applicable-${index}`}
                    checked={courier.is_fw_applicable}
                    onCheckedChange={(checked) => updateCourierPricing(index, "is_fw_applicable", checked)}
                    disabled={isCreating}
                  />
                  <Label htmlFor={`is_fw_applicable-${index}`}>Forward Applicable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`is_rto_applicable-${index}`}
                    checked={courier.is_rto_applicable}
                    onCheckedChange={(checked) => updateCourierPricing(index, "is_rto_applicable", checked)}
                    disabled={isCreating}
                  />
                  <Label htmlFor={`is_rto_applicable-${index}`}>RTO Applicable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`is_cod_applicable-${index}`}
                    checked={courier.is_cod_applicable}
                    onCheckedChange={(checked) => updateCourierPricing(index, "is_cod_applicable", checked)}
                    disabled={isCreating}
                  />
                  <Label htmlFor={`is_cod_applicable-${index}`}>COD Applicable</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`is_cod_reversal_applicable-${index}`}
                    checked={courier.is_cod_reversal_applicable}
                    onCheckedChange={(checked) => updateCourierPricing(index, "is_cod_reversal_applicable", checked)}
                    disabled={isCreating}
                  />
                  <Label htmlFor={`is_cod_reversal_applicable-${index}`}>COD Reversal</Label>
                </div>
                <div>
                  <Label htmlFor={`weight_slab-${index}`}>Weight Slab (kg)</Label>
                  <Input
                    id={`weight_slab-${index}`}
                    type="number"
                    step="0.1"
                    value={courier.weight_slab}
                    onChange={(e) => updateCourierPricing(index, "weight_slab", e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor={`increment_weight-${index}`}>Increment Weight (kg)</Label>
                  <Input
                    id={`increment_weight-${index}`}
                    type="number"
                    step="0.1"
                    value={courier.increment_weight}
                    onChange={(e) => updateCourierPricing(index, "increment_weight", e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <Label htmlFor={`increment_price-${index}`}>Increment Price</Label>
                  <Input
                    id={`increment_price-${index}`}
                    type="number"
                    value={courier.increment_price}
                    onChange={(e) => updateCourierPricing(index, "increment_price", e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Zone Pricing</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`withinCity-base_price-${index}`}>Within City Base Price</Label>
                    <Input
                      id={`withinCity-base_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinCity.base_price}
                      onChange={(e) => updateZonePricing(index, "withinCity", "base_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinCity-increment_price-${index}`}>Within City Increment</Label>
                    <Input
                      id={`withinCity-increment_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinCity.increment_price}
                      onChange={(e) => updateZonePricing(index, "withinCity", "increment_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinZone-base_price-${index}`}>Within Zone Base Price</Label>
                    <Input
                      id={`withinZone-base_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinZone.base_price}
                      onChange={(e) => updateZonePricing(index, "withinZone", "base_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinZone-increment_price-${index}`}>Within Zone Increment</Label>
                    <Input
                      id={`withinZone-increment_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinZone.increment_price}
                      onChange={(e) => updateZonePricing(index, "withinZone", "increment_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinMetro-base_price-${index}`}>Within Metro Base Price</Label>
                    <Input
                      id={`withinMetro-base_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinMetro.base_price}
                      onChange={(e) => updateZonePricing(index, "withinMetro", "base_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinMetro-increment_price-${index}`}>Within Metro Increment</Label>
                    <Input
                      id={`withinMetro-increment_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinMetro.increment_price}
                      onChange={(e) => updateZonePricing(index, "withinMetro", "increment_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinRoi-base_price-${index}`}>Within ROI Base Price</Label>
                    <Input
                      id={`withinRoi-base_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinRoi.base_price}
                      onChange={(e) => updateZonePricing(index, "withinRoi", "base_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`withinRoi-increment_price-${index}`}>Within ROI Increment</Label>
                    <Input
                      id={`withinRoi-increment_price-${index}`}
                      type="number"
                      value={courier.zonePricing.withinRoi.increment_price}
                      onChange={(e) => updateZonePricing(index, "withinRoi", "increment_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`northEast-base_price-${index}`}>North East Base Price</Label>
                    <Input
                      id={`northEast-base_price-${index}`}
                      type="number"
                      value={courier.zonePricing.northEast.base_price}
                      onChange={(e) => updateZonePricing(index, "northEast", "base_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`northEast-increment_price-${index}`}>North East Increment</Label>
                    <Input
                      id={`northEast-increment_price-${index}`}
                      type="number"
                      value={courier.zonePricing.northEast.increment_price}
                      onChange={(e) => updateZonePricing(index, "northEast", "increment_price", e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeCourierPricing(index)}
                disabled={formData.courierPricing.length === 1 || isCreating}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addCourierPricing} className="mt-2" disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            Add Courier Pricing
          </Button>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating || !formData.name.trim() || !formData.description.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Plan"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}