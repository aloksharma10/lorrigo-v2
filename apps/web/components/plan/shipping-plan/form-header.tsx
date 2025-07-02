'use client';

import { Package, Save, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@lorrigo/ui/components';

interface FormHeaderProps {
  isEditing: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function FormHeader({ isEditing, isSubmitting, onSubmit }: FormHeaderProps) {
  return (
    <Card className="from-primary to-primary/90 text-primary-foreground dark:from-primary dark:to-primary/90 border-0 bg-gradient-to-r shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-background/20 rounded-xl p-3 backdrop-blur-sm">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                {isEditing ? 'Edit Shipping Plan' : 'Create New Shipping Plan'}
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Configure pricing, features, and courier settings for your shipping plan
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-background text-primary hover:bg-background/90 px-6 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditing ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
