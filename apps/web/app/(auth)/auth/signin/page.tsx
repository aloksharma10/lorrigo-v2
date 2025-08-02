'use client';

import { useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, FlippingCard } from '@lorrigo/ui/components';
import { getRoleBasedRedirect } from '@/lib/routes/redirect';
import { Role } from '@lorrigo/db';
import { checkAccessAndRedirect } from '@/lib/routes/check-permission';
import { useAuthToken } from '@/components/providers/token-provider';
import Redirecting from '@/components/skeletons/redirecting';
import { VideoContainer } from '@/components/auth/video-container';
import { AlertCircle } from 'lucide-react';
import ForgotPassword from '../forgot-pass';

function SignInForm({ onForgotPasswordClick }: { onForgotPasswordClick: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuthToken } = useAuthToken();
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl');
  const urlError = searchParams.get('error');
  const { isTokenReady } = useAuthToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }

      const session = await getSession();
      const userRole = (session?.user as any)?.role as Role;

      if (session?.user.token) {
        setAuthToken(session.user.token as string);
      }

      let redirectUrl: string;

      if (callbackUrl) {
        const { hasAccess, redirectPath } = checkAccessAndRedirect(callbackUrl, userRole);
        redirectUrl = hasAccess ? callbackUrl : redirectPath;
      } else {
        redirectUrl = getRoleBasedRedirect(userRole);
      }
      router.push(redirectUrl);
    } catch (error) {
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const getErrorMessage = () => {
    if (error) return error;

    switch (urlError) {
      case 'CredentialsSignin':
        return 'Invalid email or password';
      case 'insufficient_permissions':
        return "You don't have permission to access that area. Please sign in with an authorized account.";
      case 'AccessDenied':
        return 'Access denied. Please contact your administrator.';
      case 'Configuration':
        return 'There is a problem with the server configuration. Please try again later.';
      default:
        return urlError ? 'An error occurred. Please try again.' : '';
    }
  };

  const errorMessage = getErrorMessage();

  if (isTokenReady) {
    return <Redirecting />;
  }

  return (
    <Card className="w-full max-w-md m-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">
          Sign in to your account
        </CardTitle>
        {callbackUrl && (
          <CardDescription className="text-center text-sm">
            You need to sign in to access this page
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email address</Label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="mt-1">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="font-medium text-primary hover:text-primary/80 dark:text-primary/80 dark:hover:text-primary/60"
              >
                Forgot your password?
              </button>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Don't have an account?
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/auth/signup">
              <Button variant="outline" className="w-full">
                Create an account
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignIn() {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleForgotPasswordClick = () => {
    setIsFlipped(true);
  };

  const handleBackToSignInClick = () => {
    setIsFlipped(false);
  };

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <FlippingCard
        className="w-full max-w-md m-auto"
        frontContent={<SignInForm onForgotPasswordClick={handleForgotPasswordClick} />}
        backContent={<ForgotPassword onBackToSignInClick={handleBackToSignInClick} />}
        height={600} // Adjusted height to accommodate form content
        width={400}
        toggle={isFlipped}
      />
      <VideoContainer />
    </Suspense>
  );
}