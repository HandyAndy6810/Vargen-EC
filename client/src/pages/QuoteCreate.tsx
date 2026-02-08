import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Sparkles, 
  Settings, 
  Camera, 
  ImagePlus, 
  X,
  Loader2,
  Check,
  DollarSign,
  FileText,
  Save,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCustomers } from "@/hooks/use-customers";
import { queryClient } from "@/lib/queryClient";

interface QuoteItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface GeneratedQuote {
  jobTitle: string;
  summary: string;
  items: QuoteItem[];
  notes: string;
  estimatedHours: number;
  totalLabour: number;
  totalMaterials: number;
  totalAmount: number;
}

export default function QuoteCreate() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [step, setStep] = useState<"input" | "generating" | "result">("input");

  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: customers } = useCustomers();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description,
          imageBase64: photoBase64,
          customerName: customerName || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate quote");
      }
      return res.json() as Promise<GeneratedQuote>;
    },
    onSuccess: (data) => {
      const safeQuote: GeneratedQuote = {
        jobTitle: data.jobTitle || "Untitled Job",
        summary: data.summary || "",
        items: Array.isArray(data.items) ? data.items.map((item: any) => ({
          description: item.description || "Item",
          quantity: Number(item.quantity) || 1,
          unit: item.unit || "each",
          unitPrice: Number(item.unitPrice) || 0,
        })) : [],
        notes: data.notes || "",
        estimatedHours: Number(data.estimatedHours) || 0,
        totalLabour: Number(data.totalLabour) || 0,
        totalMaterials: Number(data.totalMaterials) || 0,
        totalAmount: Number(data.totalAmount) || 0,
      };
      setGeneratedQuote(safeQuote);
      setStep("result");
    },
    onError: (err: Error) => {
      setStep("input");
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!generatedQuote) throw new Error("No quote to save");
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          totalAmount: String(generatedQuote.totalAmount),
          content: JSON.stringify(generatedQuote),
          status: "draft",
        }),
      });
      if (!res.ok) throw new Error("Failed to save quote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Quote saved", description: "Your quote has been saved as a draft." });
      setLocation("/quotes");
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message || "Could not save the quote. Please try again.", variant: "destructive" });
    },
  });

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Photo too large", description: "Please use a photo under 10MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleGenerate = () => {
    if (!description.trim()) {
      toast({ title: "Description required", description: "Tell us about the job first.", variant: "destructive" });
      return;
    }
    setStep("generating");
    generateMutation.mutate();
  };

  const handleStartOver = () => {
    setStep("input");
    setGeneratedQuote(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F5F2] pb-32">
      <div className="px-6 pt-12 mb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation("/quotes")}
            className="rounded-full bg-white shadow-sm"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Create Quote</h1>
            <p className="text-[#666666]">
              {step === "result" ? "Review your AI-generated quote" : "Choose your preferred method"}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        {step === "input" && (
          <div className="bg-white p-1 rounded-2xl flex gap-1 mb-8 shadow-sm border border-black/5">
            <button 
              onClick={() => setMode("simple")}
              className={cn(
                "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
                mode === "simple" ? "bg-primary text-white" : "text-[#666666] hover:bg-black/5"
              )}
              data-testid="tab-simple"
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
              data-testid="tab-advanced"
            >
              <Settings className="w-4 h-4" />
              Advanced
            </button>
          </div>
        )}

        {/* Simple Mode - Input */}
        {mode === "simple" && step === "input" && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-black/5">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">AI Quote Generator</h2>
              <p className="text-sm text-[#666666]">Snap a photo and describe the job</p>
            </div>

            <div className="space-y-5">
              {/* Photo Upload */}
              <div className="space-y-3">
                <Label className="text-base font-bold text-[#1A1A1A]">
                  Job Photo <span className="font-normal text-[#999999] text-sm">(optional but helps accuracy)</span>
                </Label>

                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-black/10">
                    <img src={photoPreview} alt="Job photo" className="w-full h-48 object-cover" />
                    <button
                      onClick={removePhoto}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                      data-testid="button-remove-photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-[#FFF1EB] border-2 border-dashed border-primary/30 text-primary font-bold active:scale-95 transition-all"
                      data-testid="button-take-photo"
                    >
                      <Camera className="w-8 h-8" />
                      <span className="text-sm">Take Photo</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-[#F5F3F0] border-2 border-dashed border-black/10 text-[#666666] font-bold active:scale-95 transition-all"
                      data-testid="button-upload-photo"
                    >
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-sm">Upload</span>
                    </button>
                  </div>
                )}

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhoto}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhoto}
                />
              </div>

              {/* Job Description */}
              <div className="space-y-3">
                <Label className="text-base font-bold text-[#1A1A1A]">
                  What's the job? <span className="text-primary">*</span>
                </Label>
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Example: Replace kitchen sink tap and fix leaky faucet in the bathroom. Existing tap is a mixer, need to match chrome finish. Also check under-sink plumbing for any leaks."
                  className="min-h-[120px] rounded-2xl border-black/10 bg-[#FAFAFA] text-base focus-visible:ring-primary/20"
                  data-testid="input-description"
                />
                <p className="text-xs text-[#999999]">
                  The more detail you give, the more accurate your quote will be
                </p>
              </div>

              {/* Client Name */}
              <div className="space-y-2 pt-4 border-t border-black/5">
                <Label className="text-sm font-bold text-[#666666]">
                  Client Name <span className="font-normal text-[#999999]">(optional)</span>
                </Label>
                <Input 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith" 
                  className="rounded-xl h-12 border-black/10"
                  data-testid="input-customer-name"
                />
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate}
                disabled={!description.trim()}
                className="w-full h-16 rounded-2xl text-lg font-bold bg-primary text-white shadow-lg shadow-primary/20 disabled:opacity-40"
                data-testid="button-generate-quote"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Quote
              </Button>
            </div>
          </div>
        )}

        {/* Generating State */}
        {step === "generating" && (
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-black/5">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Generating Quote</h2>
              <p className="text-[#666666] mb-8">
                AI is analysing the job{photoBase64 ? " and photo" : ""} to build your quote...
              </p>
              <div className="flex items-center gap-3 text-primary">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-medium">This usually takes 10-15 seconds</span>
              </div>
            </div>
          </div>
        )}

        {/* Result View */}
        {step === "result" && generatedQuote && (
          <div className="space-y-4">
            {/* Quote Header Card */}
            <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-black/5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#1A1A1A]">{generatedQuote.jobTitle}</h2>
                  <p className="text-sm text-[#666666] leading-relaxed mt-1">{generatedQuote.summary}</p>
                </div>
              </div>

              {/* Total */}
              <div className="bg-[#FFF1EB] rounded-2xl p-5 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#666666] font-medium">Quote Total</span>
                  <span className="text-3xl font-bold text-primary">${generatedQuote.totalAmount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex gap-6 mt-3 text-sm">
                  <div>
                    <span className="text-[#999999]">Labour: </span>
                    <span className="font-bold text-[#1A1A1A]">${generatedQuote.totalLabour.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[#999999]">Materials: </span>
                    <span className="font-bold text-[#1A1A1A]">${generatedQuote.totalMaterials.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                {generatedQuote.estimatedHours > 0 && (
                  <p className="text-xs text-[#999999] mt-2">
                    Estimated time: ~{generatedQuote.estimatedHours} hour{generatedQuote.estimatedHours !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5">
              <h3 className="font-bold text-[#1A1A1A] text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Line Items
              </h3>
              <div className="space-y-3">
                {generatedQuote.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-start p-4 bg-[#FAFAFA] rounded-2xl" data-testid={`quote-item-${i}`}>
                    <div className="flex-1 mr-4">
                      <p className="font-medium text-[#1A1A1A] text-sm">{item.description}</p>
                      <p className="text-xs text-[#999999] mt-1">
                        {item.quantity} {item.unit} x ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-bold text-[#1A1A1A] shrink-0">
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {generatedQuote.notes && (
              <div className="bg-[#FFFDE7] rounded-2xl p-5 border border-yellow-200/50">
                <h4 className="font-bold text-[#1A1A1A] text-sm mb-2">Notes & Assumptions</h4>
                <p className="text-sm text-[#666666] leading-relaxed">{generatedQuote.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full h-16 rounded-2xl text-lg font-bold bg-primary text-white shadow-lg shadow-primary/20"
                data-testid="button-save-quote"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Save Quote
              </Button>
              
              <Button
                onClick={handleStartOver}
                variant="ghost"
                className="w-full h-14 rounded-2xl text-base font-bold text-[#666666]"
                data-testid="button-start-over"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Mode Placeholder */}
        {mode === "advanced" && step === "input" && (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-black/5">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#8B7E74] flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Advanced Mode</h2>
              <p className="text-[#666666] mb-6">Full manual control over your quote — coming next</p>
              <Button
                onClick={() => setMode("simple")}
                variant="outline"
                className="rounded-2xl h-12 px-8 font-bold border-2"
                data-testid="button-switch-to-simple"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Try AI Simple Mode
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
