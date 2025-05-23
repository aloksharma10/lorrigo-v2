'use client';

import type React from 'react';
import { useState } from 'react';
import { Button, Input, Label } from '@lorrigo/ui/components';
import { X } from 'lucide-react';

interface FormModalProps {
  title: string;
  description?: string;
  onSubmit: (data: Record<string, string>) => void;
  onClose: () => void;
  fields: Array<{
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
  }>;
  modalId?: string;
}

export function FormModal({ title, description, onSubmit, onClose, fields }: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-neutral-100">
          <X className="h-5 w-5 text-neutral-500" />
        </button>
      </div>

      {description && <p className="mt-2 text-neutral-600">{description}</p>}

      <form onSubmit={handleSubmit} className="mt-4">
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type || 'text'}
                placeholder={field.placeholder}
                required={field.required}
                onChange={handleChange}
                value={formData[field.name] || ''}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Submit</Button>
        </div>
      </form>
    </div>
  );
}
