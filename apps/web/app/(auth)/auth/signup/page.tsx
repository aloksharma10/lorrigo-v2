'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { Eye, EyeOff, Building2, User, Mail, Phone, FileText, Lock, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import {
  Input,
  Label,
  Button,
  Progress,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@lorrigo/ui/components';
import { VideoContainer } from '@/components/auth/video-container';
import { useShopifyAuth } from '@/lib/hooks/use-shopify-auth';

interface FormData {
  name: string;
  email: string;
  password: string;
  business_name: string;
  phone: string;
  gstin: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function SignUp() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    business_name: '',
    phone: '',
    gstin: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const router = useRouter();
  const { loginWithShopify, isLoading: shopifyLoading, error: shopifyError } = useShopifyAuth();

  // Handle Google OAuth signup
  const handleGoogleSignup = async () => {
    if (isGoogleLoading) return;

    setIsGoogleLoading(true);
    setErrors({});

    try {
      // Start Google OAuth flow - this will redirect to Google consent screen
      await signIn('google', {
        callbackUrl: '/dashboard',
      });

      // Note: The code below won't execute immediately because signIn will redirect
      // The actual session handling happens in the NextAuth callbacks
    } catch (error) {
      console.error('Google signup error:', error);
      setErrors({ submit: 'Google signup failed. Please try again.' });
      setIsGoogleLoading(false);
    }
  };

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        break;
      case 'password':
        if (value.length < 6) return 'Password must be at least 6 characters long';
        break;
      case 'name':
        if (value.length < 2) return 'Name must be at least 2 characters long';
        break;
      case 'business_name':
        if (value.length < 2) return 'Business name must be at least 2 characters long';
        break;
      case 'phone':
        if (value && (value.length !== 10 || !/^\d+$/.test(value))) {
          return 'Phone number must be exactly 10 digits';
        }
        break;
      case 'gstin':
        if (value && value.length > 0 && value.length !== 15) {
          return 'GSTIN must be 15 characters long';
        }
        break;
    }
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Real-time validation
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.business_name) newErrors.business_name = 'Business name is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';

    // Field-specific validation
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof FormData]);
      if (error) newErrors[key] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setSuccess('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          business_name: formData.business_name,
          phone: formData.phone || undefined,
          gstin: formData.gstin || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register');
      }

      setSuccess('Account created successfully! Redirecting to login...');
      setShowSuccess(true);

      // Show success state for 1.5 seconds, then show redirecting state
      setTimeout(() => {
        setShowSuccess(false);
        setSuccess('Redirecting to login...');
      }, 1500);

      // Redirect after total of 3 seconds
      setTimeout(() => {
        router.push('/auth/signin');
      }, 3000);
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred during registration' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const completedFields = Object.values(formData).filter((value) => value.length > 0).length;
  const totalRequiredFields = 6; // name, email, password, business_name
  const progress = (completedFields / totalRequiredFields) * 100;

  return (
    <>
      <Card className="m-auto w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">Create your account</CardTitle>
          <CardDescription className="text-center">Join us and start managing your business today</CardDescription>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {(errors.submit || shopifyError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit || shopifyError}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3">
            {/* Google OAuth Button */}
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={isGoogleLoading}>
              {isGoogleLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
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
              )}
              {isGoogleLoading ? 'Creating account with Google...' : 'Continue with Google'}
            </Button>

            {/* Shopify OAuth Button */}
            <Button type="button" variant="outline" className="w-full" onClick={() => loginWithShopify()} disabled={shopifyLoading}>
              {shopifyLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <ShoppingBag className="mr-2 h-4 w-4" />
              )}
              {shopifyLoading ? 'Connecting to Shopify...' : 'Continue with Shopify'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Business Name
                </Label>
                <Input
                  id="business_name"
                  name="business_name"
                  type="text"
                  placeholder="Enter business name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  className={errors.business_name ? 'border-red-500' : ''}
                />
                {errors.business_name && <p className="text-sm text-red-500">{errors.business_name}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {formData.password && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Password strength</span>
                    <span className={passwordStrength < 50 ? 'text-red-500' : passwordStrength < 75 ? 'text-yellow-500' : 'text-green-500'}>
                      {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Medium' : 'Strong'}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-1" />
                </div>
              )}
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="10-digit phone number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={10}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  GSTIN (Optional)
                </Label>
                <Input
                  id="gstin"
                  name="gstin"
                  type="text"
                  placeholder="15-character GSTIN"
                  value={formData.gstin}
                  onChange={handleInputChange}
                  maxLength={15}
                  className={errors.gstin ? 'border-red-500' : ''}
                />
                {errors.gstin && <p className="text-sm text-red-500">{errors.gstin}</p>}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || showSuccess}
              className={`h-11 w-full text-base font-medium transition-all duration-300 ${showSuccess ? 'border-green-600 bg-green-600 hover:bg-green-600' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating account...
                </div>
              ) : showSuccess ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Account Created!
                </div>
              ) : success && success.includes('Redirecting') ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Redirecting...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">Don't have an account?</span>
            </div>
          </div>

          <Link href="/auth/signin">
            <Button variant="outline" className="w-full">
              Already have an account? Sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
      <VideoContainer />
    </>
  );
}
