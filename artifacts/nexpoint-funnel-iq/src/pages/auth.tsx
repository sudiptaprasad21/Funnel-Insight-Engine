import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { storeCustomer, setGuestMode } from "@/lib/auth";
import { Phone, Mail, User, ArrowRight, Loader2 } from "lucide-react";

async function upsertCustomer(name: string, email: string, phone?: string, source?: string): Promise<{ id: number; name: string }> {
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
      source: source ?? "direct",
    }),
  });
  if (!res.ok) throw new Error("Failed to create customer");
  const data = await res.json();
  return { id: data.id, name: data.name };
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginName, setLoginName] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const customer = await upsertCustomer("Google User", `google.user.${Date.now()}@gmail.com`, undefined, "google");
      storeCustomer(customer.id, customer.name);
      setLocation("/");
    } catch {
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) { setError("Please enter your email."); return; }
    setLoading(true);
    setError("");
    try {
      const name = loginName.trim() || loginEmail.split("@")[0];
      const customer = await upsertCustomer(name, loginEmail.trim(), undefined, "email_login");
      storeCustomer(customer.id, customer.name);
      setLocation("/");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) { setError("Name and email are required."); return; }
    setLoading(true);
    setError("");
    try {
      const customer = await upsertCustomer(regName.trim(), regEmail.trim(), regPhone.trim() || undefined, "register");
      storeCustomer(customer.id, customer.name);
      setLocation("/");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    setGuestMode();
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] flex flex-col">
      {/* Top bar */}
      <div className="bg-red-600 py-2 text-center text-white text-sm font-medium tracking-wide">
        May Sale — Up to 30% off all products through May 31st
      </div>

      {/* Header */}
      <header className="border-b border-red-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <HappyMomLogo className="h-9 w-9" />
            <span className="text-2xl font-serif text-red-900 font-bold tracking-tight">Happy Mom</span>
          </div>
        </div>
      </header>

      {/* Auth card */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Badge className="bg-red-100 text-red-800 border-none rounded-full px-4 py-1 mb-4">Welcome</Badge>
            <h1 className="text-3xl font-serif font-bold text-slate-900 mb-2">Your Motherhood Journey</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Create an account or sign in to access exclusive deals and track your orders.
            </p>
          </div>

          <Card className="border border-red-100 shadow-sm">
            <CardContent className="p-6">
              {/* Google login */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 flex items-center gap-3 border-slate-200 hover:bg-slate-50 mb-4"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="font-medium">Continue with Google</span>
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <Tabs defaultValue="login">
                <TabsList className="w-full mb-4 bg-red-50">
                  <TabsTrigger value="login" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-red-700">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex-1 data-[state=active]:bg-white data-[state=active]:text-red-700">
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Your Name <span className="text-slate-400">(optional)</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Jane Doe"
                          className="pl-9 h-11 border-slate-200"
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
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
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <Button
                      type="submit"
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Sign In
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </form>
                </TabsContent>

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
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">Phone Number <span className="text-slate-400">(optional)</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          className="pl-9 h-11 border-slate-200"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-600 text-sm">{error}</p>}
                    <Button
                      type="submit"
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Account
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleGuest}
                  className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                >
                  Continue as guest →
                </button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
            <br />Your data helps us personalize your shopping experience.
          </p>
        </div>
      </div>

      {/* Footer */}
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
      <path d="M20 30C20 30 10 23 10 16C10 12.686 12.686 10 16 10C17.862 10 19.525 10.87 20.6 12.23C20.775 12.449 21.225 12.449 21.4 12.23C22.475 10.87 24.138 10 26 10C29.314 10 32 12.686 32 16C32 23 22 30 20 30Z" fill="#DC2626" />
      <path d="M17 19L16 21H18L17 23M20 18L20 23M23 19L24 21H22L23 23" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
