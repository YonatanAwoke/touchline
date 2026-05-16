import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import earlyAccessIllustration from "@/assets/early-access-illustration.png";
import earlyAccessIllustrationDark from "@/assets/early-access-illustration-dark.png";
import { isValidEmail } from "@/lib/utils";
import { useThemeAsset } from "@/lib/useThemeAsset";

const EarlyAccess = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const heroSrc = useThemeAsset(earlyAccessIllustration, earlyAccessIllustrationDark);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!isValidEmail(email)) {
      setStatus({ type: "error", message: "Please enter a valid email address." });
      return;
    }

    setSending(true);
    fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data && data.error) || "Request failed");
        setStatus({ type: "success", message: data.message || "You're registered for early access." });
        setEmail("");
      })
      .catch((err: Error) => {
        setStatus({ type: "error", message: err.message || "Something went wrong." });
      })
      .finally(() => setSending(false));
  };

  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [sending, setSending] = useState(false);

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
            Get Early Access
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email address and we'll notify you when early access is available.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border-border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            type="submit"
            variant="login"
            size="lg"
            className="w-full"
            disabled={sending}
          >
            {sending ? "Sending..." : "Notify Me"}
          </Button>
        </form>
        {status && (
          <p
            className={`mt-3 text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`}
            role="status"
          >
            {status.message}
          </p>
        )}
      </div>

      {/* Right - Illustration */}
      <div className="hidden items-center justify-center bg-background md:flex md:w-1/2">
        <img
          src={heroSrc}
          alt="VIP early access stadium pass illustration"
          className="max-h-[600px] w-auto object-contain"
        />
      </div>
    </div>
  );
};

export default EarlyAccess;
