'use client';
import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Badge,
  Progress,
  Separator,
  Alert,
  AlertDescription,
  toast,
} from '@lorrigo/ui/components';
import { User, CreditCard, FileCheck, Settings, Bell, DollarSign, Building, Package, Wallet, Truck, Printer, Save, Loader2, CheckCircle, Shield } from 'lucide-react';
import { UserProfile, useUserOperations } from '@/lib/apis/users';

// Zod schema for form validation
const userProfileSchema = z.object({
  // Company Details
  company: z.string().min(1, 'Company name is required').max(255),
  company_name: z.string().min(1, 'Display name is required').max(255),
  logo_url: z.string().url('Must be a valid URL').max(500).optional().or(z.literal('')),
  
  // Notification Settings
  notification_settings: z.object({
    email: z.boolean(),
    whatsapp: z.boolean(),
    system: z.boolean(),
  }),
  
  // KYC Details
  business_type: z.enum(['INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED']).optional(),
  pan: z.string().length(10, 'PAN must be exactly 10 characters').optional().or(z.literal('')),
  adhaar: z.string().length(12, 'Aadhaar must be exactly 12 characters').optional().or(z.literal('')),
  gst_no: z.string().length(15, 'GST number must be exactly 15 characters').optional().or(z.literal('')),
  kyc_submitted: z.boolean(),
  kyc_verified: z.boolean(),
  
  // Seller Config
  is_d2c: z.boolean(),
  is_b2b: z.boolean(),
  is_prepaid: z.boolean(),
  is_cod: z.boolean(),
  is_fw: z.boolean(),
  is_rto: z.boolean(),
  is_cod_reversal: z.boolean(),
  
  // Billing and Remittance
  payment_method: z.enum(['PREPAID', 'WALLET', 'CARD', 'BANK_TRANSFER', 'COD', 'UPI']),
  remittance_cycle: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM']),
  remittance_min_amount: z.number().min(0, 'Amount cannot be negative'),
  remittance_days_after_delivery: z.number().min(0, 'Days cannot be negative'),
  early_remittance_charge: z.number().min(0, 'Charge cannot be negative').max(100, 'Charge cannot exceed 100%'),
  remittance_days_of_week: z.array(z.number().min(0).max(6)),
  billing_cycle_type: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM']),
  
  // Label/Manifest Format
  label_format: z.enum(['THERMAL', 'A4']),
  manifest_format: z.enum(['THERMAL', 'A4']),
});

type UserProfileFormData = z.infer<typeof userProfileSchema>;

interface UserProfileFormProps {
  userId: string;
  profile: UserProfile | null;
  // onSuccess?: () => void;
}

export function UserProfileForm({ userId, profile }: UserProfileFormProps) {
  console.log(profile);
  const [activeTab, setActiveTab] = useState('basic');
  const { updateUserProfile } = useUserOperations();

  // Initialize form with default values
  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      company: '',
      company_name: '',
      logo_url: '',
      notification_settings: { email: true, whatsapp: true, system: true },
      business_type: undefined,
      pan: '',
      adhaar: '',
      gst_no: '',
      kyc_submitted: false,
      kyc_verified: false,
      is_d2c: true,
      is_b2b: true,
      is_prepaid: true,
      is_cod: true,
      is_fw: true,
      is_rto: true,
      is_cod_reversal: true,
      payment_method: 'PREPAID',
      remittance_cycle: 'WEEKLY',
      remittance_min_amount: 0,
      remittance_days_after_delivery: 7,
      early_remittance_charge: 0,
      remittance_days_of_week: [5],
      billing_cycle_type: 'MONTHLY',
      label_format: 'THERMAL',
      manifest_format: 'THERMAL',
    },
  });

  // Watch form values for dynamic updates
  const watchedValues = form.watch();

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      'company', 'company_name', 'logo_url', 
      'business_type', 'pan', 'adhaar', 'gst_no', 'kyc_submitted', 'kyc_verified',
      'acc_holder_name', 'acc_number', 'ifsc_number', 'acc_type',
      'is_d2c', 'is_b2b', 'is_prepaid', 'is_cod', 'is_fw', 'is_rto', 'is_cod_reversal',
      'payment_method', 'remittance_cycle', 'remittance_min_amount', 'remittance_days_after_delivery',
      'early_remittance_charge', 'billing_cycle_type', 'label_format', 'manifest_format',
    ];
    const filledFields = fields.filter(field => {
      const value = watchedValues[field as keyof UserProfileFormData];
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'boolean') return value;
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    });
    return Math.round((filledFields.length / fields.length) * 100);
  };

  const completion = calculateCompletion();

  // Update form data when profile is loaded
  useEffect(() => {
    if (profile) {
      const formData: UserProfileFormData = {
        company: profile.company || '',
        company_name: profile.company_name || '',
        logo_url: profile.logo_url || '',
        notification_settings: {
          email: profile.notification_settings?.email ?? true,
          whatsapp: profile.notification_settings?.whatsapp ?? true,
          system: profile.notification_settings?.system ?? true,
        },
        business_type: profile.business_type as any,
        pan: profile.pan || '',
        adhaar: profile.adhaar || '',
        gst_no: profile.gst_no || '',
        kyc_submitted: profile.kyc_submitted,
        kyc_verified: profile.kyc_verified,
        is_d2c: profile.is_d2c,
        is_b2b: profile.is_b2b,
        is_prepaid: profile.is_prepaid,
        is_cod: profile.is_cod,
        is_fw: profile.is_fw,
        is_rto: profile.is_rto,
        is_cod_reversal: profile.is_cod_reversal,
        payment_method: profile.payment_method as any,
        remittance_cycle: profile.remittance_cycle as any,
        remittance_min_amount: profile.remittance_min_amount,
        remittance_days_after_delivery: profile.remittance_days_after_delivery,
        early_remittance_charge: profile.early_remittance_charge,
        remittance_days_of_week: profile.remittance_days_of_week || [5],
        billing_cycle_type: profile.billing_cycle_type as any,
        label_format: (profile.label_format as 'THERMAL' | 'A4') || 'THERMAL',
        manifest_format: (profile.manifest_format as 'THERMAL' | 'A4') || 'THERMAL',
      };
      form.reset(formData);
    }
  }, [profile, form]);

  const onSubmit = async (data: UserProfileFormData) => {
    try {
      await updateUserProfile.mutateAsync({ userId, data });
      toast.success('Profile updated successfully');
      // if (onSuccess) onSuccess();
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const isCodEnabled = form.watch('is_cod');
  useEffect(() => {
    if (isCodEnabled) {
      form.setValue('is_cod_reversal', true);
    } else{
      form.setValue('is_cod_reversal', false);
    }
  }, [isCodEnabled]);
  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile Configuration
              </CardTitle>
              <CardDescription>Manage your complete business profile and settings</CardDescription>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Profile Completion</span>
                <Badge variant={completion === 100 ? 'default' : 'secondary'}>{completion}%</Badge>
              </div>
              <Progress value={completion} className="w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger value="kyc" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">KYC</span>
              </TabsTrigger>
              <TabsTrigger value="seller" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Seller</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">System</span>
              </TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                  <CardDescription>Basic company details and branding information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your company name" {...field} />
                          </FormControl>
                          <FormDescription>Legal name of your company</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter display name" {...field} />
                          </FormControl>
                          <FormDescription>Name shown to customers</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logo_url"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Company Logo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/logo.png" {...field} />
                          </FormControl>
                          <FormDescription>URL to your company logo (will be displayed on labels and documents)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <Label className="text-base font-semibold">Notification Preferences</Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="notification_settings.email"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>Receive updates via email</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notification_settings.whatsapp"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>WhatsApp Notifications</FormLabel>
                              <FormDescription>Receive updates via WhatsApp</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="notification_settings.system"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>System Notifications</FormLabel>
                              <FormDescription>In-app notifications</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* KYC Details Tab */}
            <TabsContent value="kyc" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    KYC Verification
                  </CardTitle>
                  <CardDescription>Know Your Customer details for compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="business_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select business type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                              <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                              <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                              <SelectItem value="LLP">Limited Liability Partnership</SelectItem>
                              <SelectItem value="PRIVATE_LIMITED">Private Limited</SelectItem>
                              <SelectItem value="PUBLIC_LIMITED">Public Limited</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">KYC Status</Label>
                      <div className="flex gap-4">
                        <FormField
                          control={form.control}
                          name="kyc_submitted"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-sm">Submitted</FormLabel>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="kyc_verified"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-sm">Verified</FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="pan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PAN Number</FormLabel>
                          <FormControl>
                            <Input placeholder="ABCDE1234F" className="uppercase" maxLength={10} {...field} />
                          </FormControl>
                          <FormDescription>10-character PAN number (e.g., ABCDE1234F)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adhaar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aadhaar Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789012" maxLength={12} {...field} />
                          </FormControl>
                          <FormDescription>12-digit Aadhaar number</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gst_no"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>GST Number</FormLabel>
                          <FormControl>
                            <Input placeholder="22AAAAA0000A1Z5" className="uppercase" maxLength={15} {...field} />
                          </FormControl>
                          <FormDescription>15-character GST identification number</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {(watchedValues.kyc_submitted || watchedValues.kyc_verified) && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {watchedValues.kyc_verified
                          ? 'Your KYC has been verified successfully!'
                          : 'Your KYC documents have been submitted and are under review.'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seller Configuration Tab */}
            <TabsContent value="seller" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order Types
                    </CardTitle>
                    <CardDescription>Configure supported order types</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_d2c"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Direct to Consumer (D2C)</FormLabel>
                            <FormDescription>Accept orders directly from end customers</FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_b2b"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Business to Business (B2B)</FormLabel>
                            <FormDescription>Accept orders from other businesses</FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>Configure accepted payment methods</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_prepaid"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Prepaid Orders</FormLabel>
                            <FormDescription>Accept prepaid orders</FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_cod"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Cash on Delivery (COD)</FormLabel>
                            <FormDescription>Accept COD orders</FormDescription>
                          </div>
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Configuration
                    </CardTitle>
                    <CardDescription>Configure shipping and logistics options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="is_fw"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Forward Shipping</FormLabel>
                              <FormDescription>Standard delivery service</FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_rto"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Return to Origin (RTO)</FormLabel>
                              <FormDescription>Handle return shipments</FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_cod"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">COD Charges</FormLabel>
                              <FormDescription>Charge COD fees</FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="is_cod_reversal"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">COD Reversal</FormLabel>
                              <FormDescription>Handle COD reversals</FormDescription>
                            </div>
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Billing Configuration Tab */}
            <TabsContent value="billing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Payment Configuration
                    </CardTitle>
                    <CardDescription>Configure payment and billing settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PREPAID">Prepaid</SelectItem>
                              <SelectItem value="WALLET">Wallet</SelectItem>
                              <SelectItem value="CARD">Card</SelectItem>
                              <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                              <SelectItem value="COD">COD</SelectItem>
                              <SelectItem value="UPI">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="billing_cycle_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Cycle</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Remittance Settings
                    </CardTitle>
                    <CardDescription>Configure payment remittance schedule</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="remittance_cycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remittance Cycle</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="remittance_min_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Min Amount (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="remittance_days_after_delivery"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Days After Delivery</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="early_remittance_charge"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Early Remittance Charge (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" max="100" step="0.1" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormDescription>Charge for early remittance requests</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Remittance Days</CardTitle>
                    <CardDescription>Select the days of the week for remittance processing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="remittance_days_of_week"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-7 gap-2">
                            {weekdays.map((day, index) => (
                              <div key={day} className="flex flex-col items-center space-y-2">
                                <Checkbox
                                  checked={field.value.includes(index)}
                                  onCheckedChange={(checked) => {
                                    const currentDays = [...field.value];
                                    if (checked && !currentDays.includes(index)) {
                                      field.onChange([...currentDays, index].sort());
                                    } else if (!checked && currentDays.includes(index)) {
                                      field.onChange(currentDays.filter((d) => d !== index));
                                    }
                                  }}
                                />
                                <Label className="text-xs text-center">{day}</Label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* System Configuration Tab */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    Label & Document Configuration
                  </CardTitle>
                  <CardDescription>Configure printing and document formats</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="label_format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Format</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select label format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="THERMAL">Thermal (4x6)</SelectItem>
                              <SelectItem value="A4">A4 Paper</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Format for shipping labels</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="manifest_format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manifest Format</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select manifest format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="THERMAL">Thermal (4x6)</SelectItem>
                              <SelectItem value="A4">A4 Paper</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>Format for shipping manifests</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={form.formState.isSubmitting}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} size="lg">
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Profile
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}