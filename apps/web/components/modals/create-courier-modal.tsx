"use client"

import type React from "react"

import { toast, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@lorrigo/ui/components"
import { X, Loader2 } from "lucide-react"
import { useState } from "react"
import { useCourierOperations } from "@/lib/apis/couriers"
import { useChannelOperations } from "@/lib/apis/channels"

interface Channel {
  id: string
  name: string
  nickname: string
  is_active: boolean
}

interface CreateCourierModalProps {
  onClose: () => void
}

export function CreateCourierModal({ onClose }: CreateCourierModalProps) {
  const { createCourier } = useCourierOperations()
  const { getChannelsQuery } = useChannelOperations()

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    courier_code: "",
    is_active: true,
    is_reversed_courier: false,
    cod_charge_hard: 0,
    cod_charge_percent: 0,
    weight_slab: 1,
    weight_unit: "kg",
    increment_weight: 0.5,
    type: "EXPRESS",
    pickup_time: "14:00:00",
    channel_config_id: "",
  })

  // Use cached data - no unnecessary refetch calls
  const channels: Channel[] = getChannelsQuery.data || []
  const isLoadingChannels = getChannelsQuery.isLoading
  const isCreating = createCourier.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.courier_code.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      await createCourier.mutateAsync(formData)
      toast.success("Courier created successfully")
      onClose()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create courier")
    }
  }

  return (
    <div className="flex flex-col p-6 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Create New Courier</h2>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Courier Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
              disabled={isCreating}
            />
          </div>
          <div>
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
              required
              disabled={isCreating}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="courier_code">Courier Code</Label>
            <Input
              id="courier_code"
              value={formData.courier_code}
              onChange={(e) => setFormData((prev) => ({ ...prev, courier_code: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPRESS">Express</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="ECONOMY">Economy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_reversed_courier"
              checked={formData.is_reversed_courier}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_reversed_courier: checked }))}
            />
            <Label htmlFor="is_reversed_courier">Reverse Courier</Label>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="cod_charge_hard">COD Charge (Fixed)</Label>
            <Input
              id="cod_charge_hard"
              type="number"
              value={formData.cod_charge_hard}
              onChange={(e) => setFormData((prev) => ({ ...prev, cod_charge_hard: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="cod_charge_percent">COD Charge (%)</Label>
            <Input
              id="cod_charge_percent"
              type="number"
              step="0.1"
              value={formData.cod_charge_percent}
              onChange={(e) => setFormData((prev) => ({ ...prev, cod_charge_percent: Number(e.target.value) }))}
            />
          </div>
          <div>
            <Label htmlFor="pickup_time">Pickup Time</Label>
            <Input
              id="pickup_time"
              type="time"
              value={formData.pickup_time}
              onChange={(e) => setFormData((prev) => ({ ...prev, pickup_time: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="channel">Channel</Label>
          <Select
            value={formData.channel_config_id}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, channel_config_id: value }))}
            disabled={isLoadingChannels}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingChannels ? "Loading channels..." : "Select a channel"} />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{channel.name}</span>
                    <span className="text-xs text-muted-foreground">{channel.nickname}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoadingChannels && (
            <div className="flex items-center mt-2 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading channels...
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating || !formData.name.trim() || !formData.code.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Courier"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
