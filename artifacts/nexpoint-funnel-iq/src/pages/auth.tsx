import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  storeCustomer,
  emailRegistered,
  registerCredential,
  verifyCredential,
} from "@/lib/auth";
import { Phone, Mail, User, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

async function createCustomer(
  name: string,
  email: string,
  source: string
): Promise<{ id: number; name: string }> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      isRepeat: false,
      isSubscribed: false,
      totalOrders: 0,
      totalSpend: 0,
      source,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

function goToStore() {
  window.location.replace("/");
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  disabled,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        type={show ? "text" : "password"}
        placeholder={placeholder ?? "••••••••"}
        className="pl-9 pr-10 h-11 border-slate-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        onClick={() => setShow((s) => !s)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) { setError("Please enter your email."); return; }
    if (!loginPassword) { setError("Please enter your password."); return; }
    setLoading(true);
    setError("");
    try {
      const result = await verifyCredential(loginEmail.trim(), loginPassword);
      if (!result) {
        setError("Incorrect email or password. Please try again.");
        return;
      }
      storeCustomer(result.customerId, result.name);
      goToStore();
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { setError("Please enter your full name."); return; }
    if (!regEmail.trim()) { setError("Please enter your email address."); return; }
    if (!regPassword) { setError("Please choose a password."); return; }
    if (regPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (regPassword !== regConfirm) { setError("Passwords do not match."); return; }
    if (emailRegistered(regEmail.trim())) {
      setError("An account with this email already exists. Please sign in.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const customer = await createCustomer(regName.trim(), regEmail.trim(), "register");
      await registerCredential(regEmail.trim(), regPassword, customer.id, customer.name);
      storeCustomer(customer.id, customer.name);
      goToStore();
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] flex flex-col">
      <div className="bg-red-600 py-2 text-center text-white text-sm font-medium tracking-wide">
        May Sale — Up to 30% off all products through May 31st
      </div>

      <header className="border-b border-red-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <HappyMomLogo className="h-9 w-9" />
            <span className="text-2xl font-serif text-red-900 font-bold tracking-tight">
              Happy Mom
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Badge className="bg-red-100 text-red-800 border-none rounded-full px-4 py-1 mb-4">
              Welcome
            </Badge>
            <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">
              Your Motherhood Journey
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Create an account or sign in to access exclusive deals and track your orders.
            </p>
          </div>

          <Card className="border border-red-100 shadow-sm">
            <CardContent className="p-6">
              <Tabs defaultValue="login" onValueChange={() => setError("")}>
                <TabsList className="w-full mb-6 bg-red-50">
                  <TabsTrigger
                    value="login"
                    className="flex-1 data-[state=active]:bg-white data-[state=active]:text-red-700"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="flex-1 data-[state=active]:bg-white data-[state=active]:text-red-700"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                {/* ── Sign In ── */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="pl-9 h-11 border-slate-200"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Password</label>
                      <PasswordInput
                        value={loginPassword}
                        onChange={setLoginPassword}
                        disabled={loading}
                        required
                      />
                    </div>

                    {error && (
                      <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Sign In
                      {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Register ── */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Jane Doe"
                          className="pl-9 h-11 border-slate-200"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="pl-9 h-11 border-slate-200"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          disabled={loading}
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        Phone Number{" "}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="pl-9 h-11 border-slate-200"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          disabled={loading}
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Password</label>
                      <PasswordInput
                        value={regPassword}
                        onChange={setRegPassword}
                        placeholder="At least 6 characters"
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                      <PasswordInput
                        value={regConfirm}
                        onChange={setRegConfirm}
                        placeholder="Repeat your password"
                        disabled={loading}
                        required
                      />
                    </div>

                    {error && (
                      <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      disabled={loading}
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Create Account
                      {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            <br />
            Your data helps us personalise your shopping experience.
          </p>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100">
        © 2026 Happy Mom Demo Store. All rights reserved.
      </footer>
    </div>
  );
}

function HappyMomLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#FEE2E2" />
      <path
        d="M20 30C20 30 10 23 10 16C10 12.686 12.686 10 16 10C17.862 10 19.525 10.87 20.6 12.23C20.775 12.449 21.225 12.449 21.4 12.23C22.475 10.87 24.138 10 26 10C29.314 10 32 12.686 32 16C32 23 22 30 20 30Z"
        fill="#DC2626"
      />
      <path
        d="M17 19L16 21H18L17 23M20 18L20 23M23 19L24 21H22L23 23"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
