'use client';

import { useState, useEffect } from 'react';
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
  Switch,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  toast,
} from '@lorrigo/ui/components';
import { 
  User, 
  CreditCard, 
  Building, 
  Save, 
  Settings, 
  Bell, 
  Truck, 
  FileCheck, 
  Calendar, 
  DollarSign 
} from 'lucide-react';
import { UserProfile, useUserOperations } from '@/lib/apis/users';

interface UserProfileFormProps {
  userId: string;
  profile: UserProfile | null;
  onSuccess?: () => void;
}

export function UserProfileForm({ userId, profile, onSuccess }: UserProfileFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateUserProfile } = useUserOperations();

  // Form state for all profile fields
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    // KYC Details
    business_type: '',
    pan: '',
    adhaar: '',
    gst_no: '',
    kyc_submitted: false,
    kyc_verified: false,
    
    // Bank Details
    acc_holder_name: '',
    acc_number: '',
    ifsc_number: '',
    acc_type: '',
    
    // Seller Config
    max_negative_balance: 0,
    is_d2c: true,
    is_b2b: true,
    is_prepaid: true,
    is_fw: true,
    is_rto: true,
    is_cod: true,
    is_cod_reversal: true,
    
    // Notification Settings
    notification_settings: {
      email: true,
      whatsapp: true,
      system: true
    },
    
    // Company Details
    company: '',
    company_name: '',
    logo_url: '',
    
    // Billing and Remittance Configuration
    payment_method: 'PREPAID',
    remittance_cycle: 'WEEKLY',
    remittance_min_amount: 0,
    cod_remittance_pending: 0,
    remittance_days_of_week: [5], // Friday by default
    remittance_days_after_delivery: 7,
    early_remittance_charge: 0,
    
    // Billing Cycle
    billing_cycle_type: 'MONTHLY',
  });

  // Update form data when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        ...profile,
        // Ensure we have proper defaults for any missing fields
        notification_settings: profile.notification_settings || { email: true, whatsapp: true, system: true },
        remittance_days_of_week: profile.remittance_days_of_week || [5],
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleNotificationChange = (key: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      notification_settings: {
        ...(prev.notification_settings || {}),
        [key]: checked,
      },
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRemittanceDayChange = (day: number, checked: boolean) => {
    setFormData((prev) => {
      const currentDays = [...(prev.remittance_days_of_week || [])];
      
      if (checked && !currentDays.includes(day)) {
        return { ...prev, remittance_days_of_week: [...currentDays, day].sort() };
      } else if (!checked && currentDays.includes(day)) {
        return { ...prev, remittance_days_of_week: currentDays.filter(d => d !== day) };
      }
      
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await updateUserProfile.mutateAsync({
        userId,
        data: formData
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage user profile settings and configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="basic">
                <User className="mr-2 h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="kyc">
                <FileCheck className="mr-2 h-4 w-4" />
                KYC Details
              </TabsTrigger>
              <TabsTrigger value="bank">
                <CreditCard className="mr-2 h-4 w-4" />
                Bank Details
              </TabsTrigger>
              <TabsTrigger value="config">
                <Settings className="mr-2 h-4 w-4" />
                Seller Config
              </TabsTrigger>
              <TabsTrigger value="billing">
                <DollarSign className="mr-2 h-4 w-4" />
                Billing Settings
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name (Display)</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={formData.company_name || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    value={formData.logo_url || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Notification Preferences</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notification_email"
                        checked={formData.notification_settings?.email || false}
                        onCheckedChange={(checked) => handleNotificationChange('email', !!checked)}
                      />
                      <Label htmlFor="notification_email">Email Notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notification_whatsapp"
                        checked={formData.notification_settings?.whatsapp || false}
                        onCheckedChange={(checked) => handleNotificationChange('whatsapp', !!checked)}
                      />
                      <Label htmlFor="notification_whatsapp">WhatsApp Notifications</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notification_system"
                        checked={formData.notification_settings?.system || false}
                        onCheckedChange={(checked) => handleNotificationChange('system', !!checked)}
                      />
                      <Label htmlFor="notification_system">System Notifications</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* KYC Details Tab */}
            <TabsContent value="kyc" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={formData.business_type || ''}
                    onValueChange={(value) => handleSelectChange('business_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                      <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                      <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                      <SelectItem value="LLP">LLP</SelectItem>
                      <SelectItem value="PRIVATE_LIMITED">Private Limited</SelectItem>
                      <SelectItem value="PUBLIC_LIMITED">Public Limited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pan">PAN Number</Label>
                  <Input
                    id="pan"
                    name="pan"
                    value={formData.pan || ''}
                    onChange={handleInputChange}
                    maxLength={10}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adhaar">Aadhaar Number</Label>
                  <Input
                    id="adhaar"
                    name="adhaar"
                    value={formData.adhaar || ''}
                    onChange={handleInputChange}
                    maxLength={12}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gst_no">GST Number</Label>
                  <Input
                    id="gst_no"
                    name="gst_no"
                    value={formData.gst_no || ''}
                    onChange={handleInputChange}
                    maxLength={15}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kyc_submitted"
                      checked={formData.kyc_submitted || false}
                      onCheckedChange={(checked) => handleCheckboxChange('kyc_submitted', !!checked)}
                    />
                    <Label htmlFor="kyc_submitted">KYC Submitted</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="kyc_verified"
                      checked={formData.kyc_verified || false}
                      onCheckedChange={(checked) => handleCheckboxChange('kyc_verified', !!checked)}
                    />
                    <Label htmlFor="kyc_verified">KYC Verified</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Bank Details Tab */}
            <TabsContent value="bank" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="acc_holder_name">Account Holder Name</Label>
                  <Input
                    id="acc_holder_name"
                    name="acc_holder_name"
                    value={formData.acc_holder_name || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="acc_number">Account Number</Label>
                  <Input
                    id="acc_number"
                    name="acc_number"
                    value={formData.acc_number || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ifsc_number">IFSC Code</Label>
                  <Input
                    id="ifsc_number"
                    name="ifsc_number"
                    value={formData.ifsc_number || ''}
                    onChange={handleInputChange}
                    maxLength={11}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="acc_type">Account Type</Label>
                  <Select
                    value={formData.acc_type || ''}
                    onValueChange={(value) => handleSelectChange('acc_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAVINGS">Savings</SelectItem>
                      <SelectItem value="CURRENT">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Seller Config Tab */}
            <TabsContent value="config" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max_negative_balance">Maximum Negative Balance</Label>
                  <Input
                    id="max_negative_balance"
                    name="max_negative_balance"
                    type="number"
                    value={formData.max_negative_balance || 0}
                    onChange={handleNumberInputChange}
                  />
                  <p className="text-muted-foreground text-xs">
                    Maximum allowed negative wallet balance
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Label>Order Type Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_d2c"
                        checked={formData.is_d2c || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_d2c', !!checked)}
                      />
                      <Label htmlFor="is_d2c">Direct to Consumer (D2C)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_b2b"
                        checked={formData.is_b2b || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_b2b', !!checked)}
                      />
                      <Label htmlFor="is_b2b">Business to Business (B2B)</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Payment Method Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_prepaid"
                        checked={formData.is_prepaid || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_prepaid', !!checked)}
                      />
                      <Label htmlFor="is_prepaid">Prepaid</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_cod"
                        checked={formData.is_cod || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_cod', !!checked)}
                      />
                      <Label htmlFor="is_cod">Cash on Delivery (COD)</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Shipping Type Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_fw"
                        checked={formData.is_fw || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_fw', !!checked)}
                      />
                      <Label htmlFor="is_fw">Forward Shipping</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_rto"
                        checked={formData.is_rto || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_rto', !!checked)}
                      />
                      <Label htmlFor="is_rto">Return to Origin (RTO)</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_cod_reversal"
                        checked={formData.is_cod_reversal || false}
                        onCheckedChange={(checked) => handleCheckboxChange('is_cod_reversal', !!checked)}
                      />
                      <Label htmlFor="is_cod_reversal">COD Reversal</Label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Billing Settings Tab */}
            <TabsContent value="billing" className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Default Payment Method</Label>
                  <Select
                    value={formData.payment_method || 'PREPAID'}
                    onValueChange={(value) => handleSelectChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PREPAID">Prepaid</SelectItem>
                      <SelectItem value="WALLET">Wallet</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="billing_cycle_type">Billing Cycle Type</Label>
                  <Select
                    value={formData.billing_cycle_type || 'MONTHLY'}
                    onValueChange={(value) => handleSelectChange('billing_cycle_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BI_WEEKLY">Bi-Weekly</SelectItem>
                      <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="remittance_cycle">Remittance Cycle</Label>
                  <Select
                    value={formData.remittance_cycle || 'WEEKLY'}
                    onValueChange={(value) => handleSelectChange('remittance_cycle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select remittance cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BI_WEEKLY">Bi-Weekly</SelectItem>
                      <SelectItem value="FORTNIGHTLY">Fortnightly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="remittance_min_amount">Minimum Remittance Amount</Label>
                  <Input
                    id="remittance_min_amount"
                    name="remittance_min_amount"
                    type="number"
                    value={formData.remittance_min_amount || 0}
                    onChange={handleNumberInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="remittance_days_after_delivery">Days After Delivery for Remittance</Label>
                  <Input
                    id="remittance_days_after_delivery"
                    name="remittance_days_after_delivery"
                    type="number"
                    value={formData.remittance_days_after_delivery || 7}
                    onChange={handleNumberInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="early_remittance_charge">Early Remittance Charge (%)</Label>
                  <Input
                    id="early_remittance_charge"
                    name="early_remittance_charge"
                    type="number"
                    value={formData.early_remittance_charge || 0}
                    onChange={handleNumberInputChange}
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                  <Label>Remittance Days of Week</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {weekdays.map((day, index) => (
                      <div key={day} className="flex flex-col items-center">
                        <Checkbox
                          id={`day-${index}`}
                          checked={(formData.remittance_days_of_week || []).includes(index)}
                          onCheckedChange={(checked) => handleRemittanceDayChange(index, !!checked)}
                        />
                        <Label htmlFor={`day-${index}`} className="text-xs mt-1">
                          {day.substring(0, 3)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
} 