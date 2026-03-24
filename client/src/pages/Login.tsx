import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Sparkles, CheckCircle2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [view, setView] = useState<"auth" | "forgot">("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const forgotForm = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: data.email, password: data.password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Invalid email or password");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      setLocation("/");
    },
    onError: (err: Error) => setError(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/auth/user"], user);
      setLocation("/");
    },
    onError: (err: Error) => setError(err.message),
  });

  const forgotMutation = useMutation({
    mutationFn: async (data: ForgotForm) => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to send reset email");
      }
    },
    onSuccess: () => setForgotSent(true),
    onError: (err: Error) => setError(err.message),
  });

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setError(null);
    loginForm.reset();
    registerForm.reset();
  };

  const goToForgot = () => {
    setView("forgot");
    setError(null);
    setForgotSent(false);
    forgotForm.reset();
  };

  const goToAuth = () => {
    setView("auth");
    setError(null);
    setForgotSent(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Hero */}
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-between bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-accent/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="p-2 bg-primary rounded-lg text-primary-foreground">
              <Wrench className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Vargenezey</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Admin for <br />
            <span className="text-primary">Tradespeople</span> <br />
            Who Hate Admin.
          </h1>
          <p className="text-lg text-muted-foreground md:max-w-md mb-8">
            Create quotes, schedule jobs, and message customers in seconds. Powered by AI to do the heavy lifting for you.
          </p>
          <div className="space-y-4">
            <Feature icon={Sparkles} text="AI Quote Generation" />
            <Feature icon={CheckCircle2} text="Simple Job Scheduling" />
            <Feature icon={CheckCircle2} text="Instant Customer Messaging" />
          </div>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vargenezey App.
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full md:w-[480px] bg-card border-l border-border p-8 md:p-12 flex flex-col justify-center shadow-2xl">
        <div className="w-full max-w-sm mx-auto space-y-6">
          {view === "forgot" ? (
            <>
              <button
                onClick={goToAuth}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>

              {forgotSent ? (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Check your email</h2>
                  <p className="text-sm text-muted-foreground">
                    If that address is registered, we've sent a password reset link. It expires in 1 hour.
                  </p>
                  <Button variant="outline" className="w-full" onClick={goToAuth}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1">Forgot password?</h2>
                    <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                  </div>
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}
                  <form
                    noValidate
                    onSubmit={forgotForm.handleSubmit((d) => { setError(null); forgotMutation.mutate(d); })}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        {...forgotForm.register("email")}
                      />
                      {forgotForm.formState.errors.email && (
                        <p className="text-xs text-destructive">{forgotForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={forgotMutation.isPending}>
                      {forgotMutation.isPending ? "Sending…" : "Send reset link"}
                    </Button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
          {/* Tabs */}
          <div className="flex rounded-xl bg-muted p-1">
            <button
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "login" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab("register")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                tab === "register" ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form
              noValidate
              onSubmit={loginForm.handleSubmit((d) => { setError(null); loginMutation.mutate(d); })}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in…" : "Sign In"}
              </Button>
              <button
                type="button"
                onClick={goToForgot}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot your password?
              </button>
            </form>
          ) : (
            <form
              noValidate
              onSubmit={registerForm.handleSubmit((d) => { setError(null); registerMutation.mutate(d); })}
              className="space-y-4"
            >
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="reg-first">First name</Label>
                  <Input id="reg-first" placeholder="Jane" {...registerForm.register("firstName")} />
                  {registerForm.formState.errors.firstName && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="reg-last">Last name</Label>
                  <Input id="reg-last" placeholder="Smith" {...registerForm.register("lastName")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    {...registerForm.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-confirm">Confirm password</Label>
                <Input
                  id="reg-confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  {...registerForm.register("confirmPassword")}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Creating account…" : "Create Account"}
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-border flex items-center justify-center text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-medium text-foreground">{text}</span>
    </div>
  );
}
