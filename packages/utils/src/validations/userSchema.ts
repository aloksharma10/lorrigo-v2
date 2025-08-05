import { z } from 'zod';

// Enums matching your Prisma schema
export const WalletType = z.enum(['POSTPAID', 'PREPAID', 'REMITTANCE_WALLET']);
export const PaymentMethod = z.enum(['PREPAID', 'WALLET', 'CARD', 'BANK_TRANSFER', 'COD', 'UPI']);
export const CycleType = z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM']);
export const LabelFormat = z.enum(['THERMAL', 'A4', 'A5']);

// Notification settings schema
const NotificationSettingsSchema = z
  .object({
    whatsapp: z.boolean(),
    email: z.boolean(),
    system: z.boolean(),
  })
  .default({
    whatsapp: true,
    email: true,
    system: true,
  });

// Main user profile schema
export const UserProfileSchema = z.object({
  wallet_type: WalletType,
  business_type: z.string().optional(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g., ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  adhaar: z
    .string()
    .regex(/^\d{12}$/, 'Aadhaar must be 12 digits')
    .optional()
    .or(z.literal('')),
  gst_no: z
    .string()
    .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Invalid GST format')
    .optional()
    .or(z.literal('')),
  kyc_submitted: z.boolean(),
  kyc_verified: z.boolean(),
  acc_holder_name: z.string().max(100).optional().or(z.literal('')),
  acc_number: z.string().max(20).optional().or(z.literal('')),
  ifsc_number: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format (e.g., SBIN0001234)')
    .optional()
    .or(z.literal('')),
  acc_type: z.string().max(20).optional().or(z.literal('')),
  is_d2c: z.boolean(),
  is_b2b: z.boolean(),
  is_prepaid: z.boolean(),
  is_fw: z.boolean(),
  is_rto: z.boolean(),
  is_cod: z.boolean(),
  is_cod_reversal: z.boolean(),
  notification_settings: NotificationSettingsSchema, // Non-optional, default applied in sub-schema
  company: z.string().max(255).optional().or(z.literal('')),
  company_name: z.string().max(255).optional().or(z.literal('')),
  logo_url: z.string().url('Invalid URL format').max(500).optional().or(z.literal('')),
  payment_method: PaymentMethod,
  remittance_cycle: CycleType,
  remittance_min_amount: z.number().min(0),
  cod_remittance_pending: z.number().min(0),
  remittance_days_of_week: z.array(z.number().min(0).max(6)),
  remittance_days_after_delivery: z.number().min(0),
  early_remittance_charge: z.number().min(0).max(100),
  billing_cycle_start_date: z.date().optional(),
  billing_cycle_end_date: z.date().optional(),
  billing_cycle_type: CycleType,
  label_format: LabelFormat,
  manifest_format: LabelFormat,
});

export type UserProfileFormData = z.infer<typeof UserProfileSchema>;
