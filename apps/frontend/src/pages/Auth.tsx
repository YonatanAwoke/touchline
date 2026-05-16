import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "@/lib/auth";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import footballIllustration from "@/assets/football-illustration.png";
import footballIllustrationDark from "@/assets/football-illustration-dark.png";
import { useThemeAsset } from "@/lib/useThemeAsset";

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();
  const heroSrc = useThemeAsset(footballIllustration, footballIllustrationDark);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function isValidEmail(value: string) {
    // simple email regex for client-side validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateEmail(value: string) {
    if (!value) return "Email is required";
    if (!isValidEmail(value)) return "Enter a valid email address";
    return null;
  }

  function validatePassword(value: string) {
    if (!value) return "Password is required";
    if (value.length < 8) return "Password must be at least 8 characters";
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // client-side validation before hitting backend
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    if (eErr || pErr) {
      // show a toast summarizing the issue
      toast({ title: "Validation error", description: eErr ?? pErr ?? "Please fix the form", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.login(email, password);
    } catch (err: any) {
      const message = err?.error || err?.message || "Login failed";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Form */}
      <div className="flex w-full flex-col justify-center px-8 md:w-1/2 md:px-20 lg:px-28">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        <div className="mb-12">
          <h1
            className="cursor-pointer text-3xl font-black italic tracking-tight"
            onClick={() => navigate("/")}
          >
            <span className="text-primary">TOUCH</span>
            <span className="text-foreground">LINE</span>
          </h1>
        </div>

        <div className="mb-10">
          <h2 className="text-2xl font-extrabold uppercase tracking-wide text-foreground">
            Welcome Back
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back! Please enter your details.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              onBlur={() => setEmailError(validateEmail(email))}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              className="h-12 border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
            {emailError ? (
              <p id="email-error" className="mt-1 text-sm text-destructive">
                {emailError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                onBlur={() => setPasswordError(validatePassword(password))}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
                className="h-12 border-border bg-background pr-10 text-foreground placeholder:text-muted-foreground"
              />
              {passwordError ? (
                <p id="password-error" className="mt-1 text-sm text-destructive">
                  {passwordError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="login"
            size="lg"
            className="w-full"
            disabled={isSubmitting || !email || !password || !!emailError || !!passwordError}
          >
            {isSubmitting ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>

      {/* Right - Illustration */}
      <div className="hidden items-center justify-center bg-background md:flex md:w-1/2">
        <img
          src={heroSrc}
          alt="Football players illustration"
          className="max-h-[600px] w-auto object-contain"
        />
      </div>
    </div>
  );
};

export default Auth;
