export enum NotificationType {
  EMAIL = 'email',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  READ = 'read',
}

export enum OTPType {
  LOGIN = 'login',
  REGISTRATION = 'registration',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  PHONE_VERIFICATION = 'phone_verification',
  TWO_FACTOR = 'two_factor',
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}



export interface SystemNotification {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface NotificationPayload {
  type: NotificationType;
  priority?: NotificationPriority;
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
}

export interface OTPPayload {
  type: OTPType;
  identifier: string; // email or phone
  identifierType: 'email' | 'phone';
  purpose: string;
  metadata?: Record<string, any>;
}

export interface OTPVerificationPayload {
  identifier: string;
  identifierType: 'email' | 'phone';
  otp: string;
  type: OTPType;
}

export interface OTPData {
  id: string;
  otp: string;
  type: OTPType;
  identifier: string;
  identifierType: 'email' | 'phone';
  purpose: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
  createdAt: Date;
  verifiedAt?: Date;
  verified?: boolean;
  metadata?: Record<string, any>;
}

export interface NotificationJob {
  id: string;
  payload: NotificationPayload;
  attempts: number;
  maxAttempts: number;
  status: NotificationStatus;
  error?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject?: string;
  htmlTemplate?: string;
  textTemplate?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  userId: string;
  email: boolean;
  system: boolean;
  marketing: boolean;
  transactional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  delivered: number;
  read: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationType;
  config: Record<string, any>;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
} 