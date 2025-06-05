"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Building2, User, Mail, Phone, FileText, Lock, CheckCircle, AlertCircle } from "lucide-react"
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
  CardTitle
} from "@lorrigo/ui/components"

interface FormData {
  name: string
  email: string
  password: string
  business_name: string
  phone: string
  gstin: string
}

interface FormErrors {
  [key: string]: string
}

export default function SignUp() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    business_name: "",
    phone: "",
    gstin: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

  const router = useRouter()

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return "Please enter a valid email address"
        break
      case "password":
        if (value.length < 6) return "Password must be at least 6 characters long"
        break
      case "name":
        if (value.length < 2) return "Name must be at least 2 characters long"
        break
      case "business_name":
        if (value.length < 2) return "Business name must be at least 2 characters long"
        break
      case "phone":
        if (value && (value.length !== 10 || !/^\d+$/.test(value))) {
          return "Phone number must be exactly 10 digits"
        }
        break
      case "gstin":
        if (value && value.length > 0 && value.length !== 15) {
          return "GSTIN must be 15 characters long"
        }
        break
    }
    return ""
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    // Real-time validation
    const error = validateField(name, value)
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Required fields
    if (!formData.name) newErrors.name = "Name is required"
    if (!formData.email) newErrors.email = "Email is required"
    if (!formData.password) newErrors.password = "Password is required"
    if (!formData.business_name) newErrors.business_name = "Business name is required"

    // Field-specific validation
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof FormData])
      if (error) newErrors[key] = error
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getPasswordStrength = (password: string): number => {
    let strength = 0
    if (password.length >= 6) strength += 25
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25
    return strength
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setSuccess("")

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          business_name: formData.business_name,
          phone: formData.phone || undefined,
          gstin: formData.gstin || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to register")
      }

      setSuccess("Account created successfully! Redirecting to login...")
      setCurrentStep(3)

      setTimeout(() => {
        router.push("/auth/signin")
      }, 2000)
    } catch (error: any) {
      setErrors({ submit: error.message || "An error occurred during registration" })
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const completedFields = Object.values(formData).filter((value) => value.length > 0).length
  const totalRequiredFields = 6 // name, email, password, business_name, phone, gstin
  const progress = (completedFields / totalRequiredFields) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create your account</CardTitle>
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
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={errors.name ? "border-red-500" : ""}
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
                  className={errors.business_name ? "border-red-500" : ""}
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
                className={errors.email ? "border-red-500" : ""}
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
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? "border-red-500 pr-10" : "pr-10"}
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
                    <span
                      className={
                        passwordStrength < 50
                          ? "text-red-500"
                          : passwordStrength < 75
                            ? "text-yellow-500"
                            : "text-green-500"
                      }
                    >
                      {passwordStrength < 50 ? "Weak" : passwordStrength < 75 ? "Medium" : "Strong"}
                    </span>
                  </div>
                  <Progress value={passwordStrength} className="h-1" />
                </div>
              )}
              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className={errors.phone ? "border-red-500" : ""}
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
                  className={errors.gstin ? "border-red-500" : ""}
                />
                {errors.gstin && <p className="text-sm text-red-500">{errors.gstin}</p>}
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-11 text-base font-medium">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating account...
                </div>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Already have an account?</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/signin">Sign in to your account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
