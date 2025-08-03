'use client';

import { useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  FlippingCard,
  Separator,
} from '@lorrigo/ui/components';
import { getRoleBasedRedirect } from '@/lib/routes/redirect';
import { Role } from '@lorrigo/db';
import { checkAccessAndRedirect } from '@/lib/routes/check-permission';
import { useAuthToken } from '@/components/providers/token-provider';
import Redirecting from '@/components/skeletons/redirecting';
import { VideoContainer } from '@/components/auth/video-container';
import { AlertCircle, Fingerprint, Mail } from 'lucide-react';
import ForgotPassword from '@/components/auth/forgot-pass';
import { usePasskey } from '@/lib/hooks/use-passkey';

function SignInForm({ onForgotPasswordClick }: { onForgotPasswordClick: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'credentials' | 'passkey'>('credentials');
  const { setAuthToken } = useAuthToken();
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get('callbackUrl');
  const urlError = searchParams.get('error');
  const { authenticateWithPasskey, isPasskeySupported, isLoading: passkeyLoading } = usePasskey();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      if (authMethod === 'passkey') {
        // Handle passkey authentication
        const result = await authenticateWithPasskey(email);

        if (result && (result as any).success) {
          const userData = (result as any).user;
          const token = (result as any).token;

          // Set auth token immediately
          if (token) {
            setAuthToken(token);
          }

          // Use NextAuth signIn with the passkey token as password
          const signInResult = await signIn('credentials', {
            email: userData.email,
            password: token, // Use token as password for passkey auth
            redirect: false,
          });

          if (signInResult?.error) {
            setError('Session creation failed');
            return;
          }

          // Redirect user (no need to get session again since we have user data)
          const redirectUrl = getRedirectUrl(callbackUrl, userData.role as Role);
          router.push(redirectUrl);
        } else {
          setError('Passkey authentication failed');
        }
      } else {
        // Handle credentials authentication
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid email or password');
          return;
        }

        // Get session once and use it for both token and redirection
        const session = await getSession();
        const userRole = (session?.user as any)?.role as Role;

        if (session?.user.token) {
          setAuthToken(session.user.token as string);
        }

        const redirectUrl = getRedirectUrl(callbackUrl, userRole);
        router.push(redirectUrl);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get redirect URL
  const getRedirectUrl = (callbackUrl: string | null, userRole: Role): string => {
    if (callbackUrl) {
      const { hasAccess, redirectPath } = checkAccessAndRedirect(callbackUrl, userRole);
      return hasAccess ? callbackUrl : redirectPath;
    }
    return getRoleBasedRedirect(userRole);
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-2xl font-bold">Sign in to your account</CardTitle>
        {callbackUrl && <CardDescription className="text-center text-sm">You need to sign in to access this page</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Google OAuth Button */}
        <Button type="button" variant="outline" className="w-full" onClick={() => signIn('google', { callbackUrl: callbackUrl || undefined })}>
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">Or continue with</span>
          </div>
        </div>

        {/* Authentication Method Toggle */}
        <div className="flex space-x-2">
          <Button
            type="button"
            variant={authMethod === 'credentials' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setAuthMethod('credentials')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email & Password
          </Button>
          {isPasskeySupported() && (
            <Button
              type="button"
              variant={authMethod === 'passkey' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setAuthMethod('passkey')}
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Passkey
            </Button>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email address</Label>
            <div className="mt-1">
              <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {authMethod === 'credentials' && (
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
          )}

          {authMethod === 'credentials' && (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={onForgotPasswordClick}
                  className="text-primary hover:text-primary/80 dark:text-primary/80 dark:hover:text-primary/60 font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            </div>
          )}

          <div>
            <Button type="submit" disabled={isLoading || passkeyLoading} className="w-full" isLoading={isLoading || passkeyLoading}>
              {isLoading || passkeyLoading ? 'Signing in...' : `Sign in with ${authMethod === 'passkey' ? 'Passkey' : 'Email'}`}
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">Don't have an account?</span>
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
  const { isTokenReady } = useAuthToken();

  const handleForgotPasswordClick = () => {
    setIsFlipped(true);
  };

  const handleBackToSignInClick = () => {
    setIsFlipped(false);
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
        </div>
      }
    >
      {isTokenReady ? (
        <Redirecting />
      ) : (
        <FlippingCard
        className="bottom-0 m-auto w-full max-w-md border-none shadow-none"
        frontContent={<SignInForm onForgotPasswordClick={handleForgotPasswordClick} />}
        backContent={<ForgotPassword onBackToSignInClick={handleBackToSignInClick} />}
        height={535} // Adjusted height to accommodate form content
        // width={400}
        toggle={isFlipped}
      />
      )}
      <VideoContainer />
    </Suspense>
  );
}
