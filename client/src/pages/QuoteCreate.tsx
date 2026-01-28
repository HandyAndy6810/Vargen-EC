import { useState } from "react";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Sparkles, 
  Settings, 
  ChevronRight, 
  Check, 
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function QuoteCreate() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"simple" | "advanced">("simple");

  return (
    <div className="min-h-screen bg-[#F8F5F2] pb-32">
      {/* Header */}
      <div className="px-6 pt-12 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/")}
            className="rounded-full bg-white shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Create Quote</h1>
            <p className="text-[#666666]">Choose your preferred method</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white p-1 rounded-2xl flex gap-1 mb-8 shadow-sm border border-black/5">
          <button 
            onClick={() => setMode("simple")}
            className={cn(
              "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
              mode === "simple" ? "bg-primary text-white" : "text-[#666666] hover:bg-black/5"
            )}
          >
            <Sparkles className="w-4 h-4" />
            AI Simple
          </button>
          <button 
            onClick={() => setMode("advanced")}
            className={cn(
              "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
              mode === "advanced" ? "bg-primary text-white" : "text-[#666666] hover:bg-black/5"
            )}
          >
            <Settings className="w-4 h-4" />
            Advanced
          </button>
        </div>

        {/* Mode Selectors */}
        <div className="space-y-4 mb-8">
          <button 
            onClick={() => setMode("simple")}
            className={cn(
              "w-full text-left p-4 rounded-3xl border-2 transition-all flex items-start gap-4",
              mode === "simple" ? "bg-[#FFF1EB] border-primary" : "bg-white border-transparent shadow-sm"
            )}
          >
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-[#1A1A1A]">AI Simple Mode</span>
                <span className="bg-[#FFE5D9] text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Recommended</span>
              </div>
              <p className="text-sm text-[#666666] leading-snug">
                Just describe the job and let AI generate a professional quote with pricing and terms.
              </p>
            </div>
          </button>

          <button 
            onClick={() => setMode("advanced")}
            className={cn(
              "w-full text-left p-4 rounded-3xl border-2 transition-all flex items-start gap-4",
              mode === "advanced" ? "bg-[#FFF1EB] border-primary" : "bg-white border-transparent shadow-sm"
            )}
          >
            <div className="w-12 h-12 rounded-full bg-[#8B7E74] flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-lg text-[#1A1A1A]">Advanced Mode</span>
                <span className="bg-[#F0EEEB] text-[#8B7E74] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-[#E5E2DE]">Full Control</span>
              </div>
              <p className="text-sm text-[#666666] leading-snug">
                Manually build your quote with complete control over all details and pricing.
              </p>
            </div>
          </button>
        </div>

        {/* Main Form Area */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-black/5">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">AI Quote Generator</h2>
            <p className="text-[#666666]">Describe the job and let AI do the rest</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-bold text-[#1A1A1A]">What's the job? <span className="text-primary">*</span></Label>
              <Textarea 
                placeholder="Example: Replace kitchen sink and fix leaky faucet in master bathroom. Need new fixtures and installation."
                className="min-h-[120px] rounded-2xl border-black/10 bg-[#FAFAFA] text-base p-4 focus-visible:ring-primary/20"
              />
              <p className="text-xs text-[#999999]">Be specific about the work needed, materials, and any special requirements</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/5">
              <h3 className="font-bold text-[#1A1A1A]">Client Details <span className="font-normal text-[#999999] text-sm">(Optional)</span></h3>
              
              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#666666]">Client Name</Label>
                <Input placeholder="John Smith" className="rounded-xl h-12 border-black/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#666666]">Client Email</Label>
                <Input placeholder="john@example.com" className="rounded-xl h-12 border-black/10" />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-[#666666]">Client Phone</Label>
                <Input placeholder="(555) 123-4567" className="rounded-xl h-12 border-black/10" />
              </div>
            </div>

            <Button className="w-full h-16 rounded-2xl text-lg font-bold bg-[#FFAB85] hover:bg-[#FFAB85]/90 text-white shadow-lg shadow-orange-200">
              Generate Quote
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
