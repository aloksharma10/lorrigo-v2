'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@lorrigo/ui/components';

import { useUserOperations } from '@/lib/apis/users';
import { Loader2, ChevronLeft, Building2, CreditCard, Webhook, Code, Bell, Shield, DollarSign } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { BankAccountManager } from '@/components/settings/bank-account-manager';
import { WebhookConfig } from '@/components/settings/webhook-config';
import { ApiConfig } from '@/components/settings/api-config';

// Settings navigation items
const SETTINGS_NAV_ITEMS = [
  { id: 'general', name: 'General', icon: Building2, description: 'Company details and basic information' },
  { id: 'billing', name: 'Billing', icon: DollarSign, description: 'Billing cycle and payment settings' },
  { id: 'bank-accounts', name: 'Bank Accounts', icon: CreditCard, description: 'Manage your bank accounts' },
  { id: 'webhook', name: 'Webhooks', icon: Webhook, description: 'Configure webhook endpoints' },
  { id: 'api', name: 'API', icon: Code, description: 'API keys and integration settings' },
  { id: 'notifications', name: 'Notifications', icon: Bell, description: 'Notification preferences' },
  { id: 'security', name: 'Security', icon: Shield, description: 'Security and privacy settings' },
];

// Form schemas
const companyFormSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  business_type: z.string().optional(),
  pan: z.string().optional(),
  gst_no: z.string().optional(),
});

const billingFormSchema = z.object({
  billing_cycle_type: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL']),
  billing_days_of_week: z.array(z.number()).optional(),
  billing_day_of_month: z.number().min(1).max(31).optional(),
  billing_week_of_month: z.number().min(1).max(4).optional(),
  billing_days: z.array(z.number()).optional(),
  remittance_cycle: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM', 'MANUAL']),
  remittance_min_amount: z.number().min(0),
  remittance_days_after_delivery: z.number().min(1),
  early_remittance_charge: z.number().min(0),
  label_format: z.enum(['THERMAL', 'A4']),
  manifest_format: z.enum(['THERMAL', 'A4']),
});



const notificationFormSchema = z.object({
  email_notifications: z.boolean(),
  whatsapp_notifications: z.boolean(),
  system_notifications: z.boolean(),
  order_updates: z.boolean(),
  shipment_updates: z.boolean(),
  billing_updates: z.boolean(),
  remittance_updates: z.boolean(),
});

export const SellerSettingsPage = ({ initialTab = 'general' }: { initialTab?: string }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Get user data
  const { getUserById, updateUserProfile } = useUserOperations();
  const userQuery = getUserById(session?.user?.id || '');
  const user = userQuery.data?.user;



  // Form instances
  const companyForm = useForm({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      company_name: '',
      company: '',
      logo_url: '',
      business_type: '',
      pan: '',
      gst_no: '',
    },
  });

  const billingForm = useForm({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      billing_cycle_type: 'MONTHLY',
      billing_days_of_week: [1],
      billing_day_of_month: 1,
      billing_week_of_month: 1,
      billing_days: [1, 15],
      remittance_cycle: 'WEEKLY',
      remittance_min_amount: 0,
      remittance_days_after_delivery: 7,
      early_remittance_charge: 0,
      label_format: 'THERMAL',
      manifest_format: 'THERMAL',
    },
  });



  const notificationForm = useForm({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      email_notifications: true,
      whatsapp_notifications: true,
      system_notifications: true,
      order_updates: true,
      shipment_updates: true,
      billing_updates: true,
      remittance_updates: true,
    },
  });

  // Load user data into forms
  useEffect(() => {
    if (user?.profile) {
      const profile = user.profile;
      
      companyForm.reset({
        company_name: profile.company_name || '',
        company: profile.company || '',
        logo_url: profile.logo_url || '',
        business_type: profile.business_type || '',
        pan: profile.pan || '',
        gst_no: profile.gst_no || '',
      });

      billingForm.reset({
        billing_cycle_type: (profile.billing_cycle_type as any) || 'MONTHLY',
        billing_days_of_week: profile.billing_days_of_week || [1],
        billing_day_of_month: profile.billing_day_of_month || 1,
        billing_week_of_month: profile.billing_week_of_month || 1,
        billing_days: profile.billing_days || [1, 15],
        remittance_cycle: (profile.remittance_cycle as any) || 'WEEKLY',
        remittance_min_amount: profile.remittance_min_amount || 0,
        remittance_days_after_delivery: profile.remittance_days_after_delivery || 7,
        early_remittance_charge: profile.early_remittance_charge || 0,
        label_format: (profile.label_format as any) || 'THERMAL',
        manifest_format: (profile.manifest_format as any) || 'THERMAL',
      });

      if (profile.notification_settings) {
        const settings = profile.notification_settings as any;
        notificationForm.reset({
          email_notifications: settings.email ?? true,
          whatsapp_notifications: settings.whatsapp ?? true,
          system_notifications: settings.system ?? true,
          order_updates: settings.order_updates ?? true,
          shipment_updates: settings.shipment_updates ?? true,
          billing_updates: settings.billing_updates ?? true,
          remittance_updates: settings.remittance_updates ?? true,
        });
      }
    }
  }, [user, companyForm, billingForm, notificationForm]);

  const handleClose = () => {
    // noop in page usage
  };

  // Keep state in sync if initialTab changes (route change)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleCompanySubmit = async (data: z.infer<typeof companyFormSchema>) => {
    if (!user?.id) return;
    
    try {
      await updateUserProfile.mutateAsync({
        userId: user.id,
        data: {
          company_name: data.company_name,
          company: data.company,
          logo_url: data.logo_url,
          business_type: data.business_type,
          pan: data.pan,
          gst_no: data.gst_no,
        },
      });
      toast.success('Company details updated successfully');
    } catch (error) {
      toast.error('Failed to update company details');
    }
  };

  const handleBillingSubmit = async (data: z.infer<typeof billingFormSchema>) => {
    if (!user?.id) return;
    
    try {
      await updateUserProfile.mutateAsync({
        userId: user.id,
        data: {
          billing_cycle_type: data.billing_cycle_type,
          billing_days_of_week: data.billing_days_of_week,
          billing_day_of_month: data.billing_day_of_month,
          billing_week_of_month: data.billing_week_of_month,
          billing_days: data.billing_days,
          remittance_cycle: data.remittance_cycle,
          remittance_min_amount: data.remittance_min_amount,
          remittance_days_after_delivery: data.remittance_days_after_delivery,
          early_remittance_charge: data.early_remittance_charge,
          label_format: data.label_format,
          manifest_format: data.manifest_format,
        },
      });
      toast.success('Billing settings updated successfully');
    } catch (error) {
      toast.error('Failed to update billing settings');
    }
  };

  const handleNotificationSubmit = async (data: z.infer<typeof notificationFormSchema>) => {
    if (!user?.id) return;
    
    try {
      await updateUserProfile.mutateAsync({
        userId: user.id,
        data: {
          notification_settings: {
            email: data.email_notifications,
            whatsapp: data.whatsapp_notifications,
            system: data.system_notifications,
            order_updates: data.order_updates,
            shipment_updates: data.shipment_updates,
            billing_updates: data.billing_updates,
            remittance_updates: data.remittance_updates,
          },
        },
      });
      toast.success('Notification settings updated successfully');
    } catch (error) {
      toast.error('Failed to update notification settings');
    }
  };

  const filteredNavItems = SETTINGS_NAV_ITEMS.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-7xl overflow-hidden rounded-lg bg-white shadow-xl">

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Content Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-3">
                {activeTab !== 'general' && (
                <button
                  onClick={() => {
                    setActiveTab('general');
                    router.push('/seller/settings/general');
                  }}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-500" />
                </button>
              )}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {SETTINGS_NAV_ITEMS.find(item => item.id === activeTab)?.name}
                </h2>
                <p className="text-gray-500">
                  {SETTINGS_NAV_ITEMS.find(item => item.id === activeTab)?.description}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Company Details</span>
                  </CardTitle>
                  <CardDescription>
                    Update your company information and business details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...companyForm}>
                    <form onSubmit={companyForm.handleSubmit(handleCompanySubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={companyForm.control}
                          name="company_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={companyForm.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Private Limited, LLP" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={companyForm.control}
                        name="logo_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Logo URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://example.com/logo.png" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={companyForm.control}
                          name="business_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., E-commerce, Manufacturing" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={companyForm.control}
                          name="pan"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PAN Number</FormLabel>
                              <FormControl>
                                <Input placeholder="ABCDE1234F" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={companyForm.control}
                        name="gst_no"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>GST Number</FormLabel>
                            <FormControl>
                              <Input placeholder="22AAAAA0000A1Z5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateUserProfile.isPending}>
                          {updateUserProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Billing Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Configure your billing cycle and payment settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...billingForm}>
                    <form onSubmit={billingForm.handleSubmit(handleBillingSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-medium">Billing Cycle</h4>
                          <FormField
                            control={billingForm.control}
                            name="billing_cycle_type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Billing Cycle Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select billing cycle" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="DAILY">Daily</SelectItem>
                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                    <SelectItem value="BI_WEEKLY">Bi-Weekly</SelectItem>
                                    <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    <SelectItem value="CUSTOM">Custom</SelectItem>
                                    <SelectItem value="MANUAL">Manual</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={billingForm.control}
                            name="billing_day_of_month"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Billing Day of Month</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    max="31" 
                                    placeholder="1-31"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="space-y-4">
                          <h4 className="font-medium">Remittance Settings</h4>
                          <FormField
                            control={billingForm.control}
                            name="remittance_cycle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Remittance Cycle</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select remittance cycle" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="DAILY">Daily</SelectItem>
                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                    <SelectItem value="BI_WEEKLY">Bi-Weekly</SelectItem>
                                    <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    <SelectItem value="CUSTOM">Custom</SelectItem>
                                    <SelectItem value="MANUAL">Manual</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={billingForm.control}
                            name="remittance_min_amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Minimum Remittance Amount</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={billingForm.control}
                          name="remittance_days_after_delivery"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Remittance Days After Delivery</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  placeholder="7"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={billingForm.control}
                          name="early_remittance_charge"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Early Remittance Charge (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={billingForm.control}
                          name="label_format"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Label Format</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select label format" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="THERMAL">Thermal</SelectItem>
                                  <SelectItem value="A4">A4</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={billingForm.control}
                          name="manifest_format"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Manifest Format</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manifest format" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="THERMAL">Thermal</SelectItem>
                                  <SelectItem value="A4">A4</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateUserProfile.isPending}>
                          {updateUserProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'bank-accounts' && (
            <BankAccountManager userId={session?.user?.id || ''} />
          )}

          {activeTab === 'webhook' && (
            <WebhookConfig userId={session?.user?.id || ''} />
          )}

          {activeTab === 'api' && (
            <ApiConfig userId={session?.user?.id || ''} />
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Preferences</span>
                  </CardTitle>
                  <CardDescription>
                    Choose how and when you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Notification Channels</h4>
                        <div className="space-y-3">
                          <FormField
                            control={notificationForm.control}
                            name="email_notifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <FormDescription>
                                    Receive notifications via email
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

                          <FormField
                            control={notificationForm.control}
                            name="whatsapp_notifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">WhatsApp Notifications</FormLabel>
                                  <FormDescription>
                                    Receive notifications via WhatsApp
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

                          <FormField
                            control={notificationForm.control}
                            name="system_notifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">System Notifications</FormLabel>
                                  <FormDescription>
                                    Receive in-app notifications
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
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium">Notification Types</h4>
                        <div className="space-y-3">
                          <FormField
                            control={notificationForm.control}
                            name="order_updates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Order Updates</FormLabel>
                                  <FormDescription>
                                    Get notified about order status changes
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

                          <FormField
                            control={notificationForm.control}
                            name="shipment_updates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Shipment Updates</FormLabel>
                                  <FormDescription>
                                    Get notified about shipment tracking updates
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

                          <FormField
                            control={notificationForm.control}
                            name="billing_updates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Billing Updates</FormLabel>
                                  <FormDescription>
                                    Get notified about billing and payment updates
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

                          <FormField
                            control={notificationForm.control}
                            name="remittance_updates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Remittance Updates</FormLabel>
                                  <FormDescription>
                                    Get notified about remittance status changes
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
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" disabled={updateUserProfile.isPending}>
                          {updateUserProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Notification Settings
      </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                      </div>
                      <Button variant="outline">Enable</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Password</h4>
                        <p className="text-sm text-gray-500">Change your account password</p>
                      </div>
                      <Button variant="outline">Change</Button>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Session Management</h4>
                        <p className="text-sm text-gray-500">View and manage active sessions</p>
                      </div>
                      <Button variant="outline">Manage</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
