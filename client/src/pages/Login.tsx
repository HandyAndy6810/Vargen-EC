import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Wrench, Sparkles, CheckCircle2 } from "lucide-react";

export default function Login() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Hero Section */}
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-between bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
        {/* Decorative blobs */}
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
            Admin for <br/>
            <span className="text-primary">Tradespeople</span> <br/>
            Who Hate Admin.
          </h1>
          
          <p className="text-lg text-muted-foreground md:max-w-md mb-8">
            Create quotes, schedule jobs, and message customers in seconds. 
            Powered by AI to do the heavy lifting for you.
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

      {/* Login CTA */}
      <div className="w-full md:w-[480px] bg-card border-l border-border p-8 md:p-12 flex flex-col justify-center items-center shadow-2xl">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Sign in to manage your business.</p>
          </div>

          <a 
            href="/api/login"
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-medium rounded-xl text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <Wrench className="h-5 w-5 text-primary-foreground/70 group-hover:text-primary-foreground" aria-hidden="true" />
            </span>
            Sign in with Replit
          </a>
          
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-border flex items-center justify-center text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-medium text-foreground">{text}</span>
    </div>
  );
}
