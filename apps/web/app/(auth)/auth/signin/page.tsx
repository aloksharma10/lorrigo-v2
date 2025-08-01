"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { signIn, getSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
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
} from "@lorrigo/ui/components"
import { getRoleBasedRedirect } from "@/lib/routes/redirect"
import type { Role } from "@lorrigo/db"
import { checkAccessAndRedirect } from "@/lib/routes/check-permission"
import { useAuthToken } from "@/components/providers/token-provider"
import Redirecting from "@/components/skeletons/redirecting"
import { VideoContainer } from "@/components/auth/video-container"
import { AlertCircle, ArrowLeft, Mail } from "lucide-react"

function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isFlipped, setIsFlipped] = useState(false)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)

  const { setAuthToken } = useAuthToken()
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl")
  const urlError = searchParams.get("error")
  const { isTokenReady } = useAuthToken()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
        return
      }

      // Get the updated session with user role
      const session = await getSession()
      const userRole = (session?.user as any)?.role as Role

      if (session?.user.token) {
        setAuthToken(session.user.token as string)
      }

      // Determine redirect URL
      let redirectUrl: string
      if (callbackUrl) {
        // If there's a callback URL, check if user has permission to access it
        const { hasAccess, redirectPath } = checkAccessAndRedirect(callbackUrl, userRole)
        if (hasAccess) {
          redirectUrl = callbackUrl
        } else {
          // User doesn't have permission for the requested route, redirect to their dashboard
          redirectUrl = redirectPath
        }
      } else {
        // No callback URL, redirect to role-based dashboard
        redirectUrl = getRoleBasedRedirect(userRole)
      }

      router.push(redirectUrl)
    } catch (error) {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }

    setForgotPasswordLoading(true)
    setError("")

    try {
      // Replace this with your actual forgot password API call
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setForgotPasswordSuccess(true)
      } else {
        const data = await response.json()
        setError(data.message || "Failed to send reset email. Please try again.")
      }
    } catch (error) {
      setError("An error occurred. Please try again.")
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const handleFlipToForgotPassword = () => {
    setIsFlipped(true)
    setError("")
  }

  const handleBackToSignIn = () => {
    setIsFlipped(false)
    setForgotPasswordSuccess(false)
    setError("")
  }

  // Enhanced error message handling
  const getErrorMessage = () => {
    if (error) return error
    switch (urlError) {
      case "CredentialsSignin":
        return "Invalid email or password"
      case "insufficient_permissions":
        return "You don't have permission to access that area. Please sign in with an authorized account."
      case "AccessDenied":
        return "Access denied. Please contact your administrator."
      case "Configuration":
        return "There is a problem with the server configuration. Please try again later."
      default:
        return urlError ? "An error occurred. Please try again." : ""
    }
  }

  const errorMessage = getErrorMessage()

  if (isTokenReady) {
    return <Redirecting />
  }

  return (
    <div className="w-full max-w-md m-auto perspective-1000">
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front Side - Sign In */}
        <Card className="absolute inset-0 w-full backface-hidden" style={{ backfaceVisibility: "hidden" }}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl font-bold">Sign in to your account</CardTitle>
            {callbackUrl && (
              <CardDescription className="text-center text-sm">You need to sign in to access this page</CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {errorMessage && !isFlipped && (
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
                    onClick={handleFlipToForgotPassword}
                    className="font-medium text-primary hover:text-primary/80 dark:text-primary/80 dark:hover:text-primary/60 underline"
                  >
                    Forgot your password?
                  </button>
                </div>
              </div>

              <div>
                <Button type="submit" disabled={isLoading} className="w-full" isLoading={isLoading}>
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
                  <Button variant="outline" className="w-full bg-transparent">
                    Create an account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Side - Forgot Password */}
        <Card
          className="absolute inset-0 w-full backface-hidden rotate-y-180"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-2xl font-bold">Reset your password</CardTitle>
            {!forgotPasswordSuccess && (
              <CardDescription className="text-center text-sm">
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {errorMessage && isFlipped && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {forgotPasswordSuccess ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Check your email</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    We've sent a password reset link to {email}
                  </p>
                </div>
                <Button variant="outline" onClick={handleBackToSignIn} className="w-full bg-transparent">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Button>
              </div>
            ) : (
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
                  <Button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full"
                    isLoading={forgotPasswordLoading}
                  >
                    Send reset link
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToSignIn}
                    className="w-full bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to sign in
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <SignInForm />
      <VideoContainer />
    </Suspense>
  )
}
