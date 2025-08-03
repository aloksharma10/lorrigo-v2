import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './axios';
import { useAuthToken } from '@/components/providers/token-provider';
import { toast } from '@lorrigo/ui/components';

// Types
export interface NotificationPayload {
  type: 'email' | 'system';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  recipient: string;
  subject?: string;
  message: string;
  template?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledAt?: string;
  expiresAt?: string;
}

export interface OTPPayload {
  type: 'login' | 'registration' | 'password_reset' | 'email_verification' | 'phone_verification' | 'two_factor';
  identifier: string;
  identifierType: 'email' | 'phone';
  purpose: string;
  metadata?: Record<string, any>;
}

export interface OTPVerificationPayload {
  identifier: string;
  identifierType: 'email' | 'phone';
  otp: string;
  type: 'login' | 'registration' | 'password_reset' | 'email_verification' | 'phone_verification' | 'two_factor';
}

export interface SystemNotification {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface PasswordResetPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

// API Functions
export const notificationAPI = {
  // Send notification
  sendNotification: async (payload: NotificationPayload) => {
    return await api.post('/notifications/send', payload);
  },

  // Send immediate notification
  sendImmediateNotification: async (payload: NotificationPayload) => {
    return await api.post('/notifications/send-immediate', payload);
  },

  // Generate and send OTP
  generateAndSendOTP: async (payload: OTPPayload) => {
    return await api.post('/notifications/otp/generate', payload);
  },

  // Verify OTP
  verifyOTP: async (payload: OTPVerificationPayload) => {
    return await api.post('/notifications/otp/verify', payload);
  },

  // Resend OTP
  resendOTP: async (payload: OTPPayload) => {
    return await api.post('/notifications/otp/resend', payload);
  },

  // Get system notifications
  getSystemNotifications: async (userId: string, limit?: number) => {
    return await api.get(`/notifications/system/${userId}`, {
      params: { limit }
    });
  },

  // Mark notification as read
  markNotificationAsRead: async (userId: string, notificationIndex: number) => {
    return await api.put(`/notifications/system/${userId}/read/${notificationIndex}`);
  },

  // Clear system notifications
  clearSystemNotifications: async (userId: string) => {
    return await api.delete(`/notifications/system/${userId}`);
  },

  // Get notification job status
  getNotificationJobStatus: async (jobId: string) => {
    return await api.get(`/notifications/job/${jobId}`);
  },

  // Get notification service status
  getNotificationStatus: async () => {
    return await api.get('/notifications/status');
  },

  // Password reset flow
  resetPassword: async (payload: PasswordResetPayload) => {
    return await api.post('/auth/reset-password', payload);
  },
};

// React Query Hooks
export const useNotificationOperations = () => {
  const { isTokenReady } = useAuthToken();
  const queryClient = useQueryClient();

  // Get system notifications
  const getSystemNotifications = (userId: string, limit?: number) => {
    return useQuery({
      queryKey: ['system-notifications', userId, limit],
      queryFn: () => notificationAPI.getSystemNotifications(userId, limit),
      enabled: isTokenReady && !!userId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,
    });
  };

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: notificationAPI.sendNotification,
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('Notification sent successfully');
      } else {
        toast.error(data.message || 'Failed to send notification');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    },
  });

  // Send immediate notification mutation
  const sendImmediateNotification = useMutation({
    mutationFn: notificationAPI.sendImmediateNotification,
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('Notification sent immediately');
      } else {
        toast.error(data.message || 'Failed to send notification');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send notification');
    },
  });

  // Generate and send OTP mutation
  const generateAndSendOTP = useMutation({
    mutationFn: notificationAPI.generateAndSendOTP,
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('OTP sent successfully');
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    },
  });

  // Verify OTP mutation
  const verifyOTP = useMutation({
    mutationFn: notificationAPI.verifyOTP,
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('OTP verified successfully');
      } else {
        toast.error(data.message || 'Invalid OTP');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    },
  });

  // Resend OTP mutation
  const resendOTP = useMutation({
    mutationFn: notificationAPI.resendOTP,
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success('OTP resent successfully');
      } else {
        toast.error(data.message || 'Failed to resend OTP');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    },
  });

  // Mark notification as read mutation
  const markNotificationAsRead = useMutation({
    mutationFn: ({ userId, notificationIndex }: { userId: string; notificationIndex: number }) =>
      notificationAPI.markNotificationAsRead(userId, notificationIndex),
    onSuccess: (data: any, { userId }) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['system-notifications', userId] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark notification as read');
    },
  });

  // Clear system notifications mutation
  const clearSystemNotifications = useMutation({
    mutationFn: notificationAPI.clearSystemNotifications,
    onSuccess: (data: any, userId) => {
      if (data.success) {
        toast.success('Notifications cleared');
        queryClient.invalidateQueries({ queryKey: ['system-notifications', userId] });
      } else {
        toast.error(data.message || 'Failed to clear notifications');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clear notifications');
    },
  });

  return {
    getSystemNotifications,
    sendNotification,
    sendImmediateNotification,
    generateAndSendOTP,
    verifyOTP,
    resendOTP,
    markNotificationAsRead,
    clearSystemNotifications,
  };
};

// Password reset hooks
export const usePasswordReset = () => {
  // Reset password mutation
  const resetPassword = useMutation({
    mutationFn: notificationAPI.resetPassword,
    onSuccess: (data: any) => {
      if (data.success || data.message) {
        toast.success(data.message || 'Password reset successfully');
      } else {
        toast.error('Failed to reset password');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    },
  });

  return {
    resetPassword,
  };
};

export default notificationAPI;
