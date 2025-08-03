import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@lorrigo/ui/components';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from '@lorrigo/ui/components';

interface ForgotPasswordProps {
  onBackToSignInClick: () => void;
}

export default function ForgotPassword({ onBackToSignInClick }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Placeholder for actual password reset logic
      // Example: await resetPassword(email);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsLoading(false);
      // Optionally set success message or redirect
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="m-auto w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">Forgot Password</CardTitle>
        <CardDescription className="text-center text-sm">
          Enter your email address to reset your password
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-6" onSubmit={handleForgotPassword}>
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

            <Button
              type="button"
              variant="outline"
              onClick={onBackToSignInClick}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}