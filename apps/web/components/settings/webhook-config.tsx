'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  toast,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  Badge,
  Checkbox,
  Textarea,
} from '@lorrigo/ui/components';

import { Loader2, Webhook, TestTube, Trash2, Plus } from 'lucide-react';

const webhookFormSchema = z.object({
  webhook_url: z.string().url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  is_active: z.boolean(),
  secret_key: z.string().optional(),
  description: z.string().optional(),
});

type WebhookFormData = z.infer<typeof webhookFormSchema>;

const WEBHOOK_EVENTS = [
  { id: 'order.created', label: 'Order Created', description: 'When a new order is created' },
  { id: 'order.updated', label: 'Order Updated', description: 'When an order status changes' },
  { id: 'shipment.created', label: 'Shipment Created', description: 'When a new shipment is created' },
  { id: 'shipment.delivered', label: 'Shipment Delivered', description: 'When a shipment is delivered' },
  { id: 'shipment.failed', label: 'Shipment Failed', description: 'When a shipment delivery fails' },
  { id: 'remittance.created', label: 'Remittance Created', description: 'When a remittance is initiated' },
  { id: 'remittance.completed', label: 'Remittance Completed', description: 'When a remittance is completed' },
  { id: 'billing.created', label: 'Billing Created', description: 'When a billing cycle is created' },
  { id: 'billing.completed', label: 'Billing Completed', description: 'When a billing cycle is completed' },
];

interface WebhookConfigProps {
  userId: string;
}

export const WebhookConfig = ({ userId }: WebhookConfigProps) => {
  const [webhooks, setWebhooks] = useState<any[]>([
    {
      id: '1',
      webhook_url: 'https://api.example.com/webhooks/orders',
      events: ['order.created', 'order.updated'],
      is_active: true,
      secret_key: 'whsec_123456789',
      description: 'Order management webhook',
      created_at: new Date().toISOString(),
    },
  ]);

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      webhook_url: '',
      events: [],
      is_active: true,
      secret_key: '',
      description: '',
    },
  });

  const handleSubmit = async (data: WebhookFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newWebhook = {
        id: Date.now().toString(),
        ...data,
        created_at: new Date().toISOString(),
      };
      
      setWebhooks(prev => [...prev, newWebhook]);
      form.reset();
      toast.success('Webhook added successfully');
    } catch (error) {
      toast.error('Failed to add webhook');
    }
  };

  const handleDelete = async (webhookId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
      toast.success('Webhook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  const handleTest = async (webhook: any) => {
    try {
      // Simulate test call
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Test webhook sent successfully');
    } catch (error) {
      toast.error('Failed to send test webhook');
    }
  };

  const toggleWebhook = async (webhookId: string) => {
    try {
      setWebhooks(prev => prev.map(w => 
        w.id === webhookId ? { ...w, is_active: !w.is_active } : w
      ));
      toast.success('Webhook status updated');
    } catch (error) {
      toast.error('Failed to update webhook status');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Webhook className="h-5 w-5" />
            <span>Webhook Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure webhook endpoints to receive real-time updates about orders, shipments, and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="webhook_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://your-domain.com/webhook" {...field} />
                    </FormControl>
                    <FormDescription>
                      The URL where webhook events will be sent. Must be HTTPS for production.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this webhook is for..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="events"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Events *</FormLabel>
                      <FormDescription>
                        Select the events you want to receive notifications for
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {WEBHOOK_EVENTS.map((event) => (
                        <FormField
                          key={event.id}
                          control={form.control}
                          name="events"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={event.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(event.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, event.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== event.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-medium">
                                    {event.label}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {event.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secret_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Key</FormLabel>
                    <FormControl>
                      <Input placeholder="whsec_..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional secret key for webhook signature verification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Webhook</FormLabel>
                      <FormDescription>
                        Activate this webhook to start receiving events
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Webhook</span>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Existing Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Active Webhooks</CardTitle>
          <CardDescription>
            Manage your configured webhook endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.length > 0 ? (
              webhooks.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium">{webhook.webhook_url}</h4>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={webhook.is_active}
                          onCheckedChange={() => toggleWebhook(webhook.id)}
                        />
                        {webhook.is_active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {webhook.description && (
                      <p className="text-sm text-gray-600 mb-2">{webhook.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((eventId: string) => {
                        const event = WEBHOOK_EVENTS.find(e => e.id === eventId);
                        return event ? (
                          <Badge key={eventId} variant="outline" className="text-xs">
                            {event.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Created: {new Date(webhook.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(webhook)}
                      className="flex items-center space-x-1"
                    >
                      <TestTube className="h-4 w-4" />
                      <span>Test</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No webhooks configured</h3>
                <p className="text-gray-500">
                  Add your first webhook to receive real-time updates
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 