import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@lorrigo/ui/components';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@lorrigo/ui/components';
import { useForgotPassword, useResetPassword } from '@/lib/apis/users';
import { useNotificationOperations } from '@/lib/apis/notification';

interface ForgotPasswordProps {
  onBackToSignInClick: () => void;
}

type Step = 'email' | 'otp' | 'new-password' | 'success';

export default function ForgotPassword({ onBackToSignInClick }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // API hooks
  const forgotPasswordMutation = useForgotPassword();
  const { verifyOTP, resendOTP } = useNotificationOperations();
  const resetPasswordMutation = useResetPassword();

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Send forgot password request (this will generate and send OTP internally)
      const forgotResult = await forgotPasswordMutation.mutateAsync(email);

      if (forgotResult.success || forgotResult.message) {
        setSuccess('OTP sent to your email address');
        setStep('otp');
      } else {
        setError('Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const result = (await verifyOTP.mutateAsync({
        identifier: email,
        identifierType: 'email',
        otp: otp,
        type: 'password_reset',
      })) as any;

      if (result.success) {
        setStep('new-password');
        setError('');
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      // Use the users API for password reset
      const response = await resetPasswordMutation.mutateAsync({
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      if (response.success) {
        setSuccess('Password reset successfully! You can now login with your new password.');
        setStep('success');
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError('Failed to reset password. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setError('');
    try {
      const result = (await resendOTP.mutateAsync({
        type: 'password_reset',
        identifier: email,
        identifierType: 'email',
        purpose: 'Password reset verification',
        metadata: {
          userName: email.split('@')[0],
        },
      })) as any;

      if (result.success) {
        setSuccess('OTP resent successfully');
      } else {
        setError(result.message || 'Failed to resend OTP');
      }
    } catch (err: any) {
      setError('Failed to resend OTP');
    }
  };

  const isLoading = forgotPasswordMutation.isPending || resendOTP.isPending || verifyOTP.isPending;

  return (
    <Card className="m-auto w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">Forgot Password</CardTitle>
        <CardDescription className="text-center text-sm">
          {step === 'email' && 'Enter your email address to reset your password'}
          {step === 'otp' && 'Enter the OTP sent to your email'}
          {step === 'new-password' && 'Set your new password'}
          {step === 'success' && 'Password reset successful'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form className="space-y-6" onSubmit={handleSendResetEmail}>
            <div>
              <Label htmlFor="forgot-email">Email address</Label>
              <div className="mt-1">
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button type="submit" disabled={isLoading} className="w-full" isLoading={isLoading}>
                Send reset link
              </Button>

              <Button type="button" variant="outline" onClick={onBackToSignInClick} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </div>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form className="space-y-6" onSubmit={handleVerifyOTP}>
            <div>
              <Label htmlFor="otp">Enter OTP</Label>
              <div className="mt-1">
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit OTP"
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <p className="text-muted-foreground mt-2 text-sm">We've sent a 6-digit code to {email}</p>
            </div>

            <div className="space-y-3">
              <Button type="submit" disabled={isLoading} className="w-full" isLoading={isLoading}>
                Verify OTP
              </Button>

              <Button type="button" variant="outline" onClick={handleResendOTP} disabled={isLoading} className="w-full">
                Resend OTP
              </Button>

              <Button type="button" variant="ghost" onClick={() => setStep('email')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to email
              </Button>
            </div>
          </form>
        )}

        {/* New Password Step */}
        {step === 'new-password' && (
          <form className="space-y-6" onSubmit={handleSetNewPassword}>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="mt-1">
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="mt-1">
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button type="submit" disabled={isLoading} className="w-full" isLoading={isLoading}>
                Reset Password
              </Button>

              <Button type="button" variant="outline" onClick={() => setStep('otp')} className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to OTP
              </Button>
            </div>
          </form>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="text-lg font-semibold">Password Reset Successful!</h3>
              <p className="text-muted-foreground mt-2 text-sm">Your password has been reset successfully. You can now login with your new password.</p>
            </div>

            <Button type="button" onClick={onBackToSignInClick} className="w-full">
              Back to Sign In
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
