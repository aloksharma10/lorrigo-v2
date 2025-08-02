import { Button, Input, Label } from "@lorrigo/ui/components";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

interface ForgotPasswordProps {
  onBackToSignInClick: () => void;
}

export default function ForgotPassword({ onBackToSignInClick }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
  };

  return (
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
        onClick={onBackToSignInClick}
        className="w-full bg-transparent"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to sign in
      </Button>
    </div>
  </form> );
}