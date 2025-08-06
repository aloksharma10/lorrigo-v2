'use client';

import type React from 'react';

import {
  toast,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Badge,
  Separator,
  Alert,
  AlertDescription,
} from '@lorrigo/ui/components';
import { X, Loader2, Plus, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCourierOperations } from '@/lib/apis/couriers';
import { useChannelOperations, ChannelConfig } from '@/lib/apis/channels';

interface CourierFormData {
  name: string;
  code: string;
  courier_code: string;
  is_active: boolean;
  is_reversed_courier: boolean;
  cod_charge_hard: number;
  cod_charge_percent: number;
  weight_slab: number;
  weight_unit: string;
  increment_weight: number;
  type: string;
  pickup_time: string;
  channel_config_id: string;
}

interface CreateCourierModalProps {
  onClose: () => void;
  courier?: any; // For edit mode
  onSuccess?: () => void;
}

export function CreateCourierModal({ onClose, courier, onSuccess }: CreateCourierModalProps) {
  const { createCourier, updateCourier } = useCourierOperations();
  const { getChannels, getActiveChannels, createChannel } = useChannelOperations();

  const isEditMode = !!courier;

  const [formData, setFormData] = useState<CourierFormData>({
    name: courier?.name || '',
    code: courier?.code || '',
    courier_code: courier?.courier_code || '',
    is_active: courier?.is_active ?? true,
    is_reversed_courier: courier?.is_reversed_courier ?? false,
    cod_charge_hard: courier?.cod_charge_hard || 0,
    cod_charge_percent: courier?.cod_charge_percent || 0,
    weight_slab: courier?.weight_slab || 1,
    weight_unit: courier?.weight_unit || 'kg',
    increment_weight: courier?.increment_weight || 0.5,
    type: courier?.type || 'EXPRESS',
    pickup_time: courier?.pickup_time || '14:00:00',
    channel_config_id: courier?.channel_config_id || '',
  });

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelData, setNewChannelData] = useState({
    name: '',
    nickname: '',
    is_active: true,
  });

  // Get channels data with different strategies
  const channelsQuery = getChannels(1, 50); // Get more channels for selection
  const activeChannelsQuery = getActiveChannels();

  // Use active channels primarily, fallback to all channels
  const channels: ChannelConfig[] = activeChannelsQuery?.data || channelsQuery?.data?.data || [];
  const isLoadingChannels = channelsQuery?.isLoading || activeChannelsQuery?.isLoading;
  const channelsError = channelsQuery?.error || activeChannelsQuery?.error;

  const isCreating = createCourier?.isPending;
  const isUpdating = updateCourier?.isPending;
  const isCreatingChannel = createChannel?.isPending;
  const isSubmitting = isCreating || isUpdating;

  // Auto-generate code from name if not provided
  useEffect(() => {
    if (!isEditMode && formData.name && !formData.code) {
      const generatedCode = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 10);
      setFormData((prev) => ({ ...prev, code: generatedCode }));
    }
  }, [formData.name, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || !formData.code.trim() || !formData.courier_code.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.channel_config_id) {
      toast.error('Please select a channel');
      return;
    }

    try {
      if (isEditMode) {
        await updateCourier.mutateAsync({
          id: courier.id,
          ...formData,
        });
        toast.success('Courier updated successfully');
      } else {
        await createCourier.mutateAsync(formData);
        toast.success('Courier created successfully');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || `Failed to ${isEditMode ? 'update' : 'create'} courier`;
      toast.error(errorMessage);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newChannelData.name.trim() || !newChannelData.nickname.trim()) {
      toast.error('Please fill in channel name and nickname');
      return;
    }

    try {
      const createdChannel = await createChannel.mutateAsync(newChannelData);

      // Refresh channels data
      await Promise.all([channelsQuery.refetch(), activeChannelsQuery.refetch()]);

      // Auto-select the newly created channel
      setFormData((prev) => ({ ...prev, channel_config_id: createdChannel.id }));

      // Reset form and hide create channel section
      setNewChannelData({ name: '', nickname: '', is_active: true });
      setShowCreateChannel(false);

      toast.success('Channel created successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create channel');
    }
  };

  return (
    <div className="flex max-h-[85vh] flex-col overflow-hidden scrollbar-hide">
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h2 className="text-xl font-semibold">{isEditMode ? 'Edit Courier' : 'Create New Courier'}</h2>
          {isEditMode && <p className="text-muted-foreground mt-1 text-sm">Update courier configuration and settings</p>}
        </div>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Basic Information</h3>
              <Info className="text-muted-foreground h-4 w-4" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Courier Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={isSubmitting}
                  placeholder="e.g., Blue Dart Express"
                />
              </div>
              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  required
                  disabled={isSubmitting}
                  placeholder="e.g., BDE"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="courier_code">Courier Code *</Label>
                <Input
                  id="courier_code"
                  value={formData.courier_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, courier_code: e.target.value }))}
                  required
                  disabled={isSubmitting}
                  placeholder="Internal courier identifier"
                />
              </div>
              <div>
                <Label htmlFor="type">Service Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))} disabled={isSubmitting}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPRESS">Express</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="ECONOMY">Economy</SelectItem>
                    <SelectItem value="OVERNIGHT">Overnight</SelectItem>
                    <SelectItem value="SAME_DAY">Same Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Channel Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Channel Configuration</h3>
                <Info className="text-muted-foreground h-4 w-4" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateChannel(!showCreateChannel)} disabled={isSubmitting}>
                <Plus className="mr-2 h-4 w-4" />
                New Channel
              </Button>
            </div>

            {showCreateChannel && (
              <div className="bg-muted/50 space-y-3 rounded-lg border p-4">
                <h4 className="text-sm font-medium">Create New Channel</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="channel_name" className="text-xs">
                      Channel Name
                    </Label>
                    <Input
                      id="channel_name"
                      value={newChannelData.name}
                      onChange={(e) => setNewChannelData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., E-commerce Platform"
                      disabled={isCreatingChannel}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="channel_nickname" className="text-xs">
                      Nickname
                    </Label>
                    <Input
                      id="channel_nickname"
                      value={newChannelData.nickname}
                      onChange={(e) => setNewChannelData((prev) => ({ ...prev, nickname: e.target.value }))}
                      placeholder="e.g., ECOM"
                      disabled={isCreatingChannel}
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="channel_active"
                      checked={newChannelData.is_active}
                      onCheckedChange={(checked) => setNewChannelData((prev) => ({ ...prev, is_active: checked }))}
                      disabled={isCreatingChannel}
                    />
                    <Label htmlFor="channel_active" className="text-xs">
                      Active
                    </Label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateChannel(false)} disabled={isCreatingChannel}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={handleCreateChannel} disabled={isCreatingChannel || !newChannelData.name.trim()}>
                      {isCreatingChannel ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="channel">Select Channel *</Label>
              <Select
                value={formData.channel_config_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, channel_config_id: value }))}
                disabled={isLoadingChannels || isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingChannels ? 'Loading channels...' : channels.length === 0 ? 'No channels available' : 'Select a channel'} />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.name}</span>
                        <Badge variant={channel.is_active ? 'default' : 'secondary'} className="text-xs">
                          {channel.nickname}
                        </Badge>
                        {!channel.is_active && <span className="text-muted-foreground text-xs">(Inactive)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {channelsError && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Failed to load channels. Please refresh and try again.</AlertDescription>
                </Alert>
              )}

              {isLoadingChannels && (
                <div className="text-muted-foreground mt-2 flex items-center text-sm">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading channels...
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_active">Active Status</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_reversed_courier"
                  checked={formData.is_reversed_courier}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_reversed_courier: checked }))}
                  disabled={isSubmitting}
                />
                <Label htmlFor="is_reversed_courier">Reverse Courier</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing & Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Pricing & Configuration</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cod_charge_hard">COD Charge (Fixed)</Label>
                <Input
                  id="cod_charge_hard"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cod_charge_hard}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cod_charge_hard: Number(e.target.value) }))}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="cod_charge_percent">COD Charge (%)</Label>
                <Input
                  id="cod_charge_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.cod_charge_percent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cod_charge_percent: Number(e.target.value) }))}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="pickup_time">Pickup Time</Label>
                <Input
                  id="pickup_time"
                  type="time"
                  value={formData.pickup_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pickup_time: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight_slab">Weight Slab (kg)</Label>
                <Input
                  id="weight_slab"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.weight_slab}
                  onChange={(e) => setFormData((prev) => ({ ...prev, weight_slab: Number(e.target.value) }))}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="increment_weight">Increment Weight</Label>
                <Input
                  id="increment_weight"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.increment_weight}
                  onChange={(e) => setFormData((prev) => ({ ...prev, increment_weight: Number(e.target.value) }))}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="weight_unit">Weight Unit</Label>
                <Select
                  value={formData.weight_unit}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, weight_unit: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="gm">Grams (gm)</SelectItem>
                    <SelectItem value="lb">Pounds (lb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end space-x-2 border-t p-6">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !formData.name.trim() || !formData.code.trim() || !formData.courier_code.trim() || !formData.channel_config_id}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? 'Updating...' : 'Creating...'}
            </>
          ) : isEditMode ? (
            'Update Courier'
          ) : (
            'Create Courier'
          )}
        </Button>
      </div>
    </div>
  );
}
