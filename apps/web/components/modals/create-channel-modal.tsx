'use client';

import type React from 'react';

import { toast, Button, Input, Label } from '@lorrigo/ui/components';
import { X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useChannelOperations } from '@/lib/apis/channels';

interface CreateChannelModalProps {
  onClose: () => void;
}

export function CreateChannelModal({ onClose }: CreateChannelModalProps) {
  const { createChannel } = useChannelOperations();

  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
  });

  const isCreating = createChannel.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.nickname.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createChannel.mutateAsync({
        name: formData.name.trim(),
        nickname: formData.nickname.trim(),
      });
      toast.success('Channel created successfully');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create channel');
    }
  };

  return (
    <div className="flex flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Create New Channel</h2>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Channel Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., DELHIVERY"
            required
            disabled={isCreating}
          />
        </div>

        <div>
          <Label htmlFor="nickname">Nickname</Label>
          <Input
            id="nickname"
            value={formData.nickname}
            onChange={(e) => setFormData((prev) => ({ ...prev, nickname: e.target.value }))}
            placeholder="e.g., DL"
            required
            disabled={isCreating}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating || !formData.name.trim() || !formData.nickname.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Channel'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
