import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Sparkles, 
  Settings, 
  Camera, 
  ImagePlus, 
  X,
  Loader2,
  Check,
  FileText,
  RotateCcw,
  Truck,
  Percent,
  Wrench,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Link2,
  Mail,
  Copy,
  Download,
  Briefcase,
  Star,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { queryClient } from "@/lib/queryClient";
import type { Job } from "@shared/schema";

import { VoiceInput } from "@/components/voice/VoiceInput";

interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface GeneratedQuote {
  jobTitle: string;
  summary: string;
  items: QuoteLineItem[];
  notes: string;
  estimatedHours: number;
  totalLabour: number;
  totalMaterials: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

interface QuoteDefaults {
  markupPercent: number;
  callOutFee: number;
  callOutEnabled: boolean;
  labourRate: number;
  tradeType: string;
  includeGST: boolean;
}

const STORAGE_KEY = "vargenezey_quote_defaults";

const TRADE_TYPES = [
  { value: "general", label: "General Trade" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "carpenter", label: "Carpenter" },
  { value: "painter", label: "Painter" },
  { value: "tiler", label: "Tiler" },
  { value: "landscaper", label: "Landscaper" },
  { value: "roofer", label: "Roofer" },
  { value: "concreter", label: "Concreter" },
  { value: "bricklayer", label: "Bricklayer" },
  { value: "hvac", label: "HVAC / Air Con" },
  { value: "locksmith", label: "Locksmith" },
  { value: "handyman", label: "Handyman" },
];

const SUGGESTED_ITEMS = [
  { description: "Call Out Fee", quantity: 1, unit: "each", unitPrice: 80 },
  { description: "Safety Certificate / Compliance Check", quantity: 1, unit: "each", unitPrice: 120 },
  { description: "Waste Removal & Disposal", quantity: 1, unit: "lot", unitPrice: 150 },
  { description: "Site Clean-Up", quantity: 1, unit: "each", unitPrice: 75 },
  { description: "Travel / Transport", quantity: 1, unit: "each", unitPrice: 60 },
  { description: "Permit / Council Application Fee", quantity: 1, unit: "each", unitPrice: 250 },
  { description: "After Hours Surcharge", quantity: 1, unit: "each", unitPrice: 100 },
  { description: "Materials Delivery", quantity: 1, unit: "each", unitPrice: 50 },
];

let itemIdCounter = 0;
function nextItemId() {
  return `item-${Date.now()}-${++itemIdCounter}`;
}

function loadDefaults(): QuoteDefaults {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        markupPercent: parsed.markupPercent ?? 15,
        callOutFee: parsed.callOutFee ?? 80,
        callOutEnabled: parsed.callOutEnabled ?? false,
        labourRate: parsed.labourRate ?? 85,
        tradeType: parsed.tradeType ?? "general",
        includeGST: parsed.includeGST ?? false,
      };
    }
  } catch {}
  return { markupPercent: 15, callOutFee: 80, callOutEnabled: false, labourRate: 85, tradeType: "general", includeGST: false };
}

function saveDefaults(defaults: QuoteDefaults) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch {}
}

const LOADING_LINES = [
  "Counting bolts and checking margins...",
  "Making sure you don't undersell yourself...",
  "Cross-referencing 1,000 real Australian jobs...",
  "Negotiating with imaginary suppliers...",
  "Calculating travel time, parking, and a sneaky coffee...",
  "Running the numbers past the foreman...",
  "Asking the AI not to lowball you...",
  "Checking your labour rate isn't from 2018...",
  "Pricing like a tradie, not a charity...",
  "Factoring in the 'it's harder than it looks' tax...",
  "Consulting 15 years of job experience in 10 seconds...",
  "Remembering to charge for consumables this time...",
  "Checking if you've actually quoted this job before...",
  "Making sure GST is on there — the ATO is watching...",
  "Making sure cleanup time is in there...",
  "Crunching numbers so you don't have to...",
  "Waking up the apprentice...",
  "Checking steel caps...",
  "Factoring in smoko...",
  "Waiting for the supplier to pick up...",
  "Finding the tape measure...",
  "Fuelling up the ute...",
  "Arguing with the estimating software...",
  "Waiting on parts...",
  "Checking if the site has power...",
];

type Phase = "input" | "generating" | "editor" | "finalized";

export default function QuoteCreate() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [phase, setPhase] = useState<Phase>("input");
  const [lineIndex, setLineIndex] = useState(() => Math.floor(Math.random() * LOADING_LINES.length));
  const [lineVisible, setLineVisible] = useState(true);

  const [description, setDescription] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [quoteTitle, setQuoteTitle] = useState("");
  const [quoteSummary, setQuoteSummary] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [estimatedHours, setEstimatedHours] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<"custom" | "saved">("custom");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemPrice, setNewItemPrice] = useState("");

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [jobMode, setJobMode] = useState<"existing" | "new">("existing");
  const [savedQuoteId, setSavedQuoteId] = useState<number | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);

  const [notesExpanded, setNotesExpanded] = useState(false);
  const [editorMargin, setEditorMargin] = useState(0);
  const [baseItemPrices, setBaseItemPrices] = useState<Record<string, number>>({});
  const [targetPrice, setTargetPrice] = useState("");

  const [defaults, setDefaults] = useState<QuoteDefaults>(loadDefaults);
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { data: settings } = useUserSettings();
  const { data: customers } = useCustomers();

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      const res = await fetch("/api/messages/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (!res.ok) throw new Error("Failed to send email");
    },
    onSuccess: () => toast({ title: "Email sent to client!" }),
    onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
  });
  const createCustomerMutation = useCreateCustomer();

  const filteredCustomers = customers?.filter(c =>
    customerName.trim() && c.name.toLowerCase().includes(customerName.toLowerCase())
  ) ?? [];

  const selectCustomer = (c: { id: number; name: string }) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setShowCustomerDropdown(false);
  };

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setSelectedCustomerId(null);
    setShowCustomerDropdown(value.trim().length > 0);
  };

  // Detect autoStart parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const template = params.get("template");
    const autoStart = params.get("autoStart");
    
    if (autoStart === "true" && template && description === "" && phase === "input") {
      setDescription(template);
      setPhase("generating");
      generateMutation.mutate();
    }
  }, []);

  const { data: jobs } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  useEffect(() => { saveDefaults(defaults); }, [defaults]);

  useEffect(() => {
    if (phase !== "generating") return;
    const interval = setInterval(() => {
      setLineVisible(false);
      setTimeout(() => {
        setLineIndex(i => (i + 1) % LOADING_LINES.length);
        setLineVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, [phase]);

  const updateDefault = <K extends keyof QuoteDefaults>(key: K, value: QuoteDefaults[K]) => {
    setDefaults(prev => ({ ...prev, [key]: value }));
  };

  const calcTotal = () => lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = {
        description,
        imageBase64: photoBase64,
        customerName: customerName || undefined,
        markupPercent: defaults.markupPercent,
        callOutFee: defaults.callOutEnabled ? defaults.callOutFee : 0,
        targetPrice: targetPrice && parseFloat(targetPrice) > 0 ? parseFloat(targetPrice) : undefined,
      };
      if (mode === "advanced") {
        body.tradeType = defaults.tradeType;
        body.labourRate = defaults.labourRate;
        body.includeGST = defaults.includeGST;
      }
      const res = await fetch("/api/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate quote");
      }
      return res.json() as Promise<GeneratedQuote>;
    },
    onSuccess: (data) => {
      setQuoteTitle(data.jobTitle || "Untitled Job");
      setQuoteSummary(data.summary || "");
      setQuoteNotes(data.notes || "");
      setEstimatedHours(Number(data.estimatedHours) || 0);
      const items = Array.isArray(data.items) ? data.items.map((item: any) => ({
        id: nextItemId(),
        description: item.description || "Item",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "each",
        unitPrice: Number(item.unitPrice) || 0,
      })) : [];
      setLineItems(items);
      const prices: Record<string, number> = {};
      items.forEach((item: QuoteLineItem) => { prices[item.id] = item.unitPrice; });
      setBaseItemPrices(prices);
      setEditorMargin(0);
      setPhase("editor");
    },
    onError: (err: Error) => {
      setPhase("input");
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      let jobId = selectedJobId;

      if (jobMode === "new" && newJobTitle.trim()) {
        const jobRes = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: newJobTitle,
            description: quoteSummary,
            status: "scheduled",
          }),
        });
        if (!jobRes.ok) throw new Error("Failed to create job");
        const newJob = await jobRes.json();
        jobId = newJob.id;
      }

      const total = calcTotal();

      // Auto-create customer if name typed but not linked to existing
      let custId = selectedCustomerId;
      if (!custId && customerName.trim()) {
        try {
          const newCust = await createCustomerMutation.mutateAsync({ name: customerName.trim() });
          custId = newCust.id;
        } catch (custErr) {
          console.error("Auto-create customer failed:", custErr);
          // Continue saving quote without customer link rather than failing entirely
        }
      }

      const contentData = {
        jobTitle: quoteTitle,
        summary: quoteSummary,
        items: lineItems,
        notes: quoteNotes,
        estimatedHours,
        totalAmount: total,
        customerName: customerName || undefined,
        acknowledged: true,
      };

      const quoteRes = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobId: jobId || undefined,
          customerId: custId || undefined,
          totalAmount: String(total),
          content: JSON.stringify(contentData),
          status: "draft",
        }),
      });
      if (!quoteRes.ok) throw new Error("Failed to save quote");
      const savedQuote = await quoteRes.json();

      for (const item of lineItems) {
        await fetch(`/api/quotes/${savedQuote.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            description: item.description,
            quantity: item.quantity,
            price: String(item.unitPrice * item.quantity),
          }),
        });
      }

      return savedQuote;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSavedQuoteId(data.id);
      setShowFinalizeModal(false);
      setShowExportOptions(true);
      setPhase("finalized");
      toast({ title: "Quote finalized", description: "Your quote has been saved and is ready to send." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
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
    reader.onload = () => { const r = reader.result as string; setPhotoPreview(r); setPhotoBase64(r); };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null); setPhotoBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleGenerate = () => {
    if (!description.trim()) {
      toast({ title: "Description required", description: "Tell us about the job first.", variant: "destructive" });
      return;
    }
    setPhase("generating");
    generateMutation.mutate();
  };

  const handleStartOver = () => {
    setPhase("input");
    setLineItems([]);
    setQuoteTitle("");
    setQuoteSummary("");
    setQuoteNotes("");
  };

  const deleteItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const addCustomItem = () => {
    if (!newItemDesc.trim() || !newItemPrice) return;
    const id = nextItemId();
    const price = Number(newItemPrice) || 0;
    setLineItems(prev => [...prev, {
      id,
      description: newItemDesc,
      quantity: Number(newItemQty) || 1,
      unit: "each",
      unitPrice: price,
    }]);
    setBaseItemPrices(prev => ({ ...prev, [id]: price }));
    setNewItemDesc(""); setNewItemQty("1"); setNewItemPrice("");
    setShowAddModal(false);
  };

  const addSuggestedItem = (suggested: typeof SUGGESTED_ITEMS[0]) => {
    const id = nextItemId();
    setLineItems(prev => [...prev, { id, ...suggested }]);
    setBaseItemPrices(prev => ({ ...prev, [id]: suggested.unitPrice }));
    setShowAddModal(false);
  };

  const selectedTrade = TRADE_TYPES.find(t => t.value === defaults.tradeType);

  const SharedSettings = ({ compact }: { compact?: boolean }) => (
    <div className={cn("space-y-4", compact ? "pt-4 border-t border-black/5" : "")}>
      {!compact && (
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold text-muted-foreground">Pricing Options</span>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-foreground">Material Markup</Label>
          <span className="text-sm font-bold text-primary" data-testid="text-markup-value">{defaults.markupPercent}%</span>
        </div>
        <div className="flex items-center gap-3">
          <Percent className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 flex items-center justify-between gap-2">
            <button
              onClick={() => updateDefault("markupPercent", Math.max(0, defaults.markupPercent - 1))}
              className="w-11 h-11 rounded-xl bg-[#F0EDEA] dark:bg-white/10 flex items-center justify-center text-xl font-bold text-foreground dark:text-white active:scale-95 transition-transform select-none"
              data-testid="button-markup-minus"
            >−</button>
            <span className="text-base font-bold text-foreground min-w-[3rem] text-center" data-testid="text-markup-display">
              {defaults.markupPercent}%
            </span>
            <button
              onClick={() => updateDefault("markupPercent", Math.min(50, defaults.markupPercent + 1))}
              className="w-11 h-11 rounded-xl bg-[#F0EDEA] dark:bg-white/10 flex items-center justify-center text-xl font-bold text-foreground dark:text-white active:scale-95 transition-transform select-none"
              data-testid="button-markup-plus"
            >+</button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Applied to all material costs</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">Call-out Fee</Label>
          </div>
          <Switch checked={defaults.callOutEnabled} onCheckedChange={(v) => updateDefault("callOutEnabled", v)} data-testid="switch-callout" />
        </div>
        {defaults.callOutEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input type="number" value={defaults.callOutFee}
              onChange={(e) => updateDefault("callOutFee", Math.max(0, Number(e.target.value)))}
              className="rounded-xl h-10 border-black/10 w-24" data-testid="input-callout-fee" />
          </div>
        )}
      </div>
    </div>
  );

  const phaseLabel = phase === "input" ? "Step 1 of 3 — Describe the Job" 
    : phase === "generating" ? "Generating..." 
    : phase === "editor" ? "Step 2 of 3 — Review & Edit" 
    : "Step 3 of 3 — Done";

  return (
    <div className="min-h-screen bg-[#F8F5F2] dark:bg-background pb-32">
      <div className="px-6 pt-12 mb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon"
            onClick={() => phase === "editor" ? handleStartOver() : setLocation("/quotes")}
            className="rounded-full bg-white shadow-sm" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              {phase === "finalized" ? "Quote Ready" : "Create Quote"}
            </h1>
            <p className="text-sm text-muted-foreground">{phaseLabel}</p>
          </div>
        </div>

        {/* Phase Progress */}
        <div className="flex gap-2 mb-6 mt-4">
          {[1, 2, 3].map(step => (
            <div key={step} className={cn(
              "flex-1 h-1.5 rounded-full transition-all",
              (phase === "input" || phase === "generating") && step === 1 ? "bg-primary" :
              phase === "editor" && step <= 2 ? "bg-primary" :
              phase === "finalized" ? "bg-green-500" : "bg-black/10"
            )} />
          ))}
        </div>

        {/* Tab Switcher - Phase 1 only */}
        {phase === "input" && (
          <div className="bg-muted p-1 rounded-2xl flex gap-1 mb-6 shadow-sm border border-black/5">
            <button onClick={() => setMode("simple")}
              className={cn("flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
                mode === "simple" ? "bg-primary text-white" : "text-muted-foreground")}
              data-testid="tab-simple">
              <Sparkles className="w-4 h-4" /> AI Simple
            </button>
            <button onClick={() => setMode("advanced")}
              className={cn("flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all",
                mode === "advanced" ? "bg-primary text-white" : "text-muted-foreground")}
              data-testid="tab-advanced">
              <Settings className="w-4 h-4" /> Advanced
            </button>
          </div>
        )}

        {/* ════════════ PHASE 1: INPUT ════════════ */}

        {/* SIMPLE MODE */}
        {mode === "simple" && phase === "input" && (
          <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-xl border border-black/5">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">AI Quote Generator</h2>
              <p className="text-sm text-muted-foreground">Snap a photo and describe the job</p>
            </div>
            <div className="space-y-5">
              <div className="space-y-3">
                <Label className="text-base font-bold text-foreground">
                  Job Photo <span className="font-normal text-muted-foreground text-sm">(optional)</span>
                </Label>
                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-black/10">
                    <img src={photoPreview} alt="Job photo" className="w-full h-48 object-cover" />
                    <button onClick={removePhoto}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"
                      data-testid="button-remove-photo">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-[#FFF1EB] dark:bg-primary/10 border-2 border-dashed border-primary/30 text-primary font-bold"
                      data-testid="button-take-photo">
                      <Camera className="w-8 h-8" /><span className="text-sm">Take Photo</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 py-6 rounded-2xl bg-muted border-2 border-dashed border-black/10 text-muted-foreground font-bold"
                      data-testid="button-upload-photo">
                      <ImagePlus className="w-8 h-8" /><span className="text-sm">Upload</span>
                    </button>
                  </div>
                )}
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-bold text-foreground">What's the job? <span className="text-primary">*</span></Label>
                <div className="relative">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="Example: Replace kitchen sink tap and fix leaky faucet..."
                    className="min-h-[120px] rounded-2xl border-black/10 bg-[#FAFAFA] dark:bg-muted text-base pr-12"
                    data-testid="input-description" />
                  <div className="absolute right-2 bottom-2">
                    <VoiceInput onTranscript={(text) => setDescription(prev => prev ? `${prev} ${text}` : text)} />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-black/5 relative">
                <Label className="text-sm font-bold text-muted-foreground">Client Name <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input value={customerName} onChange={(e) => handleCustomerNameChange(e.target.value)}
                  onFocus={() => customerName.trim() && setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  placeholder="Search or type new name..."
                  className={cn("rounded-xl h-12 border-black/10", selectedCustomerId && "border-primary/50 bg-primary/5")}
                  data-testid="input-customer-name" />
                {selectedCustomerId && (
                  <p className="text-xs text-primary font-medium px-1">Linked to existing customer</p>
                )}
                {showCustomerDropdown && (filteredCustomers.length > 0 || customerName.trim()) && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-card rounded-xl border border-black/10 shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button key={c.id} onMouseDown={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-black/5 last:border-0">
                        <p className="font-medium text-sm">{c.name}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </button>
                    ))}
                    {filteredCustomers.length === 0 && customerName.trim() && (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        "{customerName}" will be created as a new customer
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-black/5">
                <Label className="text-sm font-bold text-muted-foreground">
                  Estimated Price <span className="font-normal">(optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">Rough idea of what it should cost? AI will shape the quote around it.</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={targetPrice}
                    onChange={e => setTargetPrice(e.target.value)}
                    placeholder="e.g. 850"
                    className="rounded-xl h-12 pl-7 border-black/10 font-medium"
                    data-testid="input-target-price"
                  />
                </div>
              </div>

              <SharedSettings compact />

              <Button onClick={handleGenerate} disabled={!description.trim()}
                className="w-full h-16 rounded-2xl text-lg font-bold bg-primary text-white shadow-lg shadow-primary/20 disabled:opacity-40"
                data-testid="button-generate-quote">
                <Sparkles className="w-5 h-5 mr-2" /> Generate Quote
              </Button>
            </div>
          </div>
        )}

        {/* ADVANCED MODE */}
        {mode === "advanced" && phase === "input" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-xl border border-black/5">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#8B7E74] dark:bg-white/20 flex items-center justify-center mb-3">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">Advanced Quote</h2>
                <p className="text-sm text-muted-foreground">More control over pricing and details</p>
              </div>
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label className="text-base font-bold text-foreground">Trade Type</Label>
                  <div className="relative">
                    <button onClick={() => setShowTradeDropdown(!showTradeDropdown)}
                      className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-black/10 bg-[#FAFAFA] dark:bg-muted text-left"
                      data-testid="button-trade-type">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{selectedTrade?.label || "General Trade"}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showTradeDropdown && "rotate-180")} />
                    </button>
                    {showTradeDropdown && (
                      <div className="absolute z-20 top-14 left-0 right-0 bg-white dark:bg-card rounded-2xl shadow-xl border border-black/10 max-h-60 overflow-y-auto">
                        {TRADE_TYPES.map(trade => (
                          <button key={trade.value}
                            onClick={() => { updateDefault("tradeType", trade.value); setShowTradeDropdown(false); }}
                            className={cn("w-full text-left px-4 py-3 text-sm",
                              defaults.tradeType === trade.value ? "bg-primary/10 text-primary font-bold" : "text-foreground")}
                            data-testid={`trade-option-${trade.value}`}>
                            {trade.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-bold text-foreground">What's the job? <span className="text-primary">*</span></Label>
                  <div className="relative">
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the full scope of work..."
                      className="min-h-[140px] rounded-2xl border-black/10 bg-[#FAFAFA] dark:bg-muted text-base pr-12"
                      data-testid="input-description-advanced" />
                    <div className="absolute right-2 bottom-2">
                      <VoiceInput onTranscript={(text) => setDescription(prev => prev ? `${prev} ${text}` : text)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-bold text-foreground">Labour Rate</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-muted-foreground">$</span>
                    <Input type="number" value={defaults.labourRate}
                      onChange={(e) => updateDefault("labourRate", Math.max(0, Number(e.target.value)))}
                      className="rounded-xl h-12 border-black/10 text-lg font-bold w-28"
                      data-testid="input-labour-rate" />
                    <span className="text-sm text-muted-foreground">per hour</span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-black/5 relative">
                  <Label className="text-sm font-bold text-muted-foreground">Client Name <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input value={customerName} onChange={(e) => handleCustomerNameChange(e.target.value)}
                    onFocus={() => customerName.trim() && setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    placeholder="Search or type new name..."
                    className={cn("rounded-xl h-12 border-black/10", selectedCustomerId && "border-primary/50 bg-primary/5")}
                    data-testid="input-customer-name-advanced" />
                  {selectedCustomerId && (
                    <p className="text-xs text-primary font-medium px-1">Linked to existing customer</p>
                  )}
                  {showCustomerDropdown && (filteredCustomers.length > 0 || customerName.trim()) && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-card rounded-xl border border-black/10 shadow-lg max-h-48 overflow-y-auto">
                      {filteredCustomers.map(c => (
                        <button key={c.id} onMouseDown={() => selectCustomer(c)}
                          className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors border-b border-black/5 last:border-0">
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && customerName.trim() && (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          <Plus className="w-3.5 h-3.5 inline mr-1" />
                          "{customerName}" will be created as a new customer
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-sm border border-black/5">
              <SharedSettings />
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
                <Label className="text-sm font-medium text-foreground">Include GST (10%)</Label>
                <Switch checked={defaults.includeGST} onCheckedChange={(v) => updateDefault("includeGST", v)} data-testid="switch-gst" />
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!description.trim()}
              className={cn(
                "w-full h-16 rounded-2xl text-lg font-bold text-white shadow-lg transition-all disabled:opacity-40",
                description.trim() && customerName.trim() 
                  ? "bg-primary shadow-primary/20" 
                  : "bg-[#8B7E74] dark:bg-white/20 shadow-[#8B7E74]/20"
              )}
              data-testid="button-generate-quote-advanced">
              <Sparkles className="w-5 h-5 mr-2" /> Generate Advanced Quote
            </Button>
          </div>
        )}

        {/* ════════════ GENERATING STATE ════════════ */}
        {phase === "generating" && (
          <div className="bg-white dark:bg-card rounded-[2rem] p-10 shadow-xl border border-black/5">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Generating Quote</h2>
              <p
                className="text-muted-foreground mb-8 h-6 transition-opacity duration-300"
                style={{ opacity: lineVisible ? 1 : 0 }}
              >
                {LOADING_LINES[lineIndex]}
              </p>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ PHASE 2: EDITOR ════════════ */}
        {phase === "editor" && (
          <div className="space-y-4">
            {/* Quote Title */}
            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-xl border border-black/5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <Input value={quoteTitle} onChange={(e) => setQuoteTitle(e.target.value)}
                    className="text-xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0"
                    data-testid="input-quote-title" />
                  <p className="text-sm text-muted-foreground mt-1">{quoteSummary}</p>
                </div>
              </div>

              {/* Running Total */}
              <div className="bg-[#FFF1EB] dark:bg-primary/10 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Running Total</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-running-total">
                    ${calcTotal().toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {estimatedHours > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">~{estimatedHours} hour{estimatedHours !== 1 ? "s" : ""} estimated</p>
                )}
              </div>
            </div>

            {/* Line Items List */}
            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Line Items ({lineItems.length})
                </h3>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium">No items yet</p>
                  <p className="text-sm mt-1">Add items to build your quote</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item, i) => {
                    const updateField = <K extends keyof QuoteLineItem>(field: K, value: QuoteLineItem[K]) => {
                      setLineItems(prev => prev.map(li => li.id === item.id ? { ...li, [field]: value } : li));
                    };
                    return (
                      <div key={item.id}
                        className="p-4 bg-[#FAFAFA] dark:bg-muted rounded-2xl"
                        data-testid={`quote-item-${i}`}>
                        <div className="flex items-start gap-2 mb-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateField("description", e.target.value)}
                            className="flex-1 min-w-0 bg-transparent border-0 border-b border-transparent focus:border-primary/30 outline-none text-sm font-medium text-foreground py-0.5 transition-colors"
                            data-testid={`input-item-desc-${i}`}
                          />
                          <button onClick={() => deleteItem(item.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-0.5"
                            data-testid={`button-delete-item-${i}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Qty</span>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateField("quantity", Math.max(1, Number(e.target.value) || 1))}
                              className="w-12 bg-white dark:bg-card border border-black/10 rounded-lg text-center text-sm font-medium text-foreground py-1 outline-none focus:border-primary/40 transition-colors"
                              data-testid={`input-item-qty-${i}`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground/50">x</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const newPrice = Math.max(0, Number(e.target.value) || 0);
                                updateField("unitPrice", newPrice);
                                setBaseItemPrices(prev => ({ ...prev, [item.id]: editorMargin === 0 ? newPrice : newPrice / (1 + editorMargin / 100) }));
                              }}
                              className="w-20 bg-white dark:bg-card border border-black/10 rounded-lg text-sm font-medium text-foreground py-1 px-2 outline-none focus:border-primary/40 transition-colors"
                              data-testid={`input-item-price-${i}`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground/50">=</span>
                          <span className="font-bold text-foreground text-sm ml-auto" data-testid={`text-item-total-${i}`}>
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Item Button */}
              <button onClick={() => { setShowAddModal(true); setAddTab("custom"); setNewItemDesc(""); setNewItemQty("1"); setNewItemPrice(""); }}
                className="w-full mt-4 py-4 rounded-2xl border-2 border-dashed border-primary/30 bg-[#FFF1EB] dark:bg-primary/10 text-primary font-bold flex items-center justify-center gap-2"
                data-testid="button-add-item">
                <Plus className="w-5 h-5" /> Add Item
              </button>
            </div>

            {/* Margin Slider */}
            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-sm border border-black/5">
              <div className="flex items-center gap-2 mb-3">
                <Percent className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-lg">Margin</h3>
                <div className="ml-auto flex items-center gap-1">
                  <input
                    type="number"
                    value={editorMargin}
                    onChange={(e) => {
                      const newMargin = Number(e.target.value);
                      setEditorMargin(newMargin);
                      setLineItems(prev => prev.map(item => {
                        const base = baseItemPrices[item.id];
                        if (base !== undefined) {
                          return { ...item, unitPrice: Math.round(base * (1 + newMargin / 100) * 100) / 100 };
                        }
                        return item;
                      }));
                    }}
                    className="w-16 bg-muted border-0 rounded-lg text-right text-lg font-bold text-primary py-1 px-2 outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                    data-testid="input-editor-margin"
                  />
                  <span className="text-lg font-bold text-primary">%</span>
                </div>
              </div>
              <Slider
                min={-30}
                max={50}
                step={0.1}
                value={[editorMargin]}
                onValueChange={([newMargin]) => {
                  setEditorMargin(newMargin);
                  setLineItems(prev => prev.map(item => {
                    const base = baseItemPrices[item.id];
                    if (base !== undefined) {
                      return { ...item, unitPrice: Math.round(base * (1 + newMargin / 100) * 100) / 100 };
                    }
                    return item;
                  }));
                }}
                className="w-full"
                data-testid="slider-editor-margin"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">-30%</span>
                <span className="text-xs text-muted-foreground">0%</span>
                <span className="text-xs text-muted-foreground">+50%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Adjust all prices by a percentage. Manually edited prices will also be affected.</p>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-sm border border-black/5">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-bold text-muted-foreground">Notes & Assumptions</Label>
                <button
                  onClick={() => setNotesExpanded(!notesExpanded)}
                  className="flex items-center gap-1 text-xs text-primary font-medium"
                  data-testid="button-expand-notes">
                  {notesExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand</>}
                </button>
              </div>
              <Textarea value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)}
                className={cn(
                  "rounded-xl border-black/10 bg-[#FAFAFA] dark:bg-muted text-sm transition-all",
                  notesExpanded ? "min-h-[240px]" : "min-h-[80px]"
                )}
                placeholder="Any notes, exclusions, or assumptions..."
                data-testid="input-quote-notes" />
            </div>

            {/* Sticky Finalize Bar */}
            <div className="fixed bottom-20 left-0 right-0 px-6 z-30">
              <div className="max-w-2xl mx-auto">
                <Button onClick={() => { setShowFinalizeModal(true); setJobMode("existing"); setSelectedJobId(null); setNewJobTitle(quoteTitle); }}
                  disabled={lineItems.length === 0}
                  className="w-full h-16 rounded-2xl text-lg font-bold bg-green-600 text-white shadow-lg shadow-green-600/30 disabled:opacity-40"
                  data-testid="button-finalize-quote">
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize Quote
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════ PHASE 3: FINALIZED ════════════ */}
        {phase === "finalized" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-card rounded-[2rem] p-8 shadow-xl border border-black/5">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Quote Finalized</h2>
                <p className="text-muted-foreground mb-2">{quoteTitle}</p>
                <span className="text-3xl font-bold text-primary" data-testid="text-final-total">
                  ${calcTotal().toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                </span>
                <p className="text-sm text-muted-foreground mt-2">{lineItems.length} line item{lineItems.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-card rounded-[2rem] p-6 shadow-sm border border-black/5 space-y-3">
              <h3 className="font-bold text-foreground text-lg mb-4">Send to Client</h3>

              <button
                onClick={() => setLocation(`/quotes/${savedQuoteId}/preview`)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FAFAFA] dark:bg-muted text-left hover-elevate active-elevate-2 transition-all"
                data-testid="button-export-pdf">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                  <Download className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Export PDF</p>
                  <p className="text-sm text-muted-foreground">Download a professional PDF quote</p>
                </div>
              </button>

              <button
                disabled={sendEmailMutation.isPending}
                onClick={() => {
                  const customer = customers?.find(c => c.id === selectedCustomerId);
                  if (!customer?.email) {
                    toast({ title: "No email on file", description: "Add an email address to this customer first.", variant: "destructive" });
                    return;
                  }
                  sendEmailMutation.mutate({
                    to: customer.email,
                    subject: `Quote: ${quoteTitle}`,
                    body: `Hi ${customer.name || "there"},\n\nPlease find your quote for ${quoteTitle} attached.\n\nTotal: $${calcTotal().toLocaleString("en-AU", { minimumFractionDigits: 2 })}\n\nView details: ${window.location.origin}/quotes/${savedQuoteId}\n\nKind regards,\n${settings?.businessName || "Your Tradie"}`,
                  });
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FAFAFA] dark:bg-muted text-left hover-elevate active-elevate-2 transition-all disabled:opacity-60"
                data-testid="button-email-client">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Email to Client</p>
                  <p className="text-sm text-muted-foreground">Send directly to your client's inbox</p>
                </div>
              </button>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/quotes/${savedQuoteId}`;
                  navigator.clipboard.writeText(url).then(() => {
                    toast({ title: "Link copied", description: "Quote link copied to clipboard." });
                  }).catch(() => {
                    toast({ title: "Copy failed", description: "Could not copy link.", variant: "destructive" });
                  });
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#FAFAFA] dark:bg-muted text-left"
                data-testid="button-copy-link">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                  <Copy className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Copy Link</p>
                  <p className="text-sm text-muted-foreground">Share a link to view the quote</p>
                </div>
              </button>
            </div>

            <Button onClick={() => setLocation("/quotes")}
              className="w-full h-14 rounded-2xl text-base font-bold"
              data-testid="button-go-to-quotes">
              View All Quotes
            </Button>
          </div>
        )}
      </div>

      

      {/* ════════════ ADD ITEM MODAL ════════════ */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="rounded-[2rem] mx-4 max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Item</DialogTitle>
          </DialogHeader>

          {/* Tab Switcher */}
          <div className="bg-muted p-1 rounded-xl flex gap-1 mb-4">
            <button onClick={() => setAddTab("custom")}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                addTab === "custom" ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              data-testid="tab-add-custom">
              Custom
            </button>
            <button onClick={() => setAddTab("saved")}
              className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                addTab === "saved" ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground")}
              data-testid="tab-add-saved">
              Suggested
            </button>
          </div>

          {addTab === "custom" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Input value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="e.g. Install power point" className="rounded-xl h-12"
                  data-testid="input-new-description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quantity</Label>
                  <Input type="number" value={newItemQty} onChange={(e) => setNewItemQty(e.target.value)}
                    className="rounded-xl h-12" data-testid="input-new-qty" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Price ($)</Label>
                  <Input type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="0.00" className="rounded-xl h-12" data-testid="input-new-price" />
                </div>
              </div>
              <Button onClick={addCustomItem} disabled={!newItemDesc.trim() || !newItemPrice}
                className="w-full h-14 rounded-2xl font-bold disabled:opacity-40"
                data-testid="button-add-custom-item">
                <Plus className="w-4 h-4 mr-2" /> Add to Quote
              </Button>
            </div>
          )}

          {addTab === "saved" && (
            <div className="space-y-2">
              {SUGGESTED_ITEMS.map((item, i) => (
                <button key={i}
                  onClick={() => addSuggestedItem(item)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#FAFAFA] dark:bg-muted text-left"
                  data-testid={`button-suggested-item-${i}`}>
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} {item.unit}</p>
                    </div>
                  </div>
                  <span className="font-bold text-foreground text-sm">${item.unitPrice.toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════ FINALIZE MODAL ════════════ */}
      <Dialog open={showFinalizeModal} onOpenChange={(open) => { setShowFinalizeModal(open); if (!open) setAckChecked(false); }}>
        <DialogContent className="rounded-[2rem] mx-4 max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Finalize Quote</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="bg-[#FFF1EB] dark:bg-primary/10 rounded-2xl p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-primary">${calcTotal().toLocaleString("en-AU", { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Acknowledgment / Liability Acceptance */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/40">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">Review & Accept Responsibility</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Before finalizing, please confirm you have carefully reviewed all line items, pricing, GST, and notes. By proceeding, you accept full ownership and responsibility for this quote. Vargen EC provides AI-assisted estimates only — all final pricing decisions are yours.
                  </p>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer" data-testid="label-ack-checkbox">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-amber-600"
                  data-testid="input-ack-checkbox"
                />
                <span className="text-sm text-foreground leading-snug">
                  I have carefully reviewed this quote and accept full ownership of all items, pricing, and details.
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4" /> Link to Job
              </Label>

              <div className="bg-muted p-1 rounded-xl flex gap-1">
                <button onClick={() => setJobMode("existing")}
                  className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                    jobMode === "existing" ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                  data-testid="tab-existing-job">
                  Existing Job
                </button>
                <button onClick={() => setJobMode("new")}
                  className={cn("flex-1 py-2.5 rounded-lg text-sm font-bold transition-all",
                    jobMode === "new" ? "bg-white dark:bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                  data-testid="tab-new-job">
                  New Job
                </button>
              </div>

              {jobMode === "existing" && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {!jobs || jobs.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No jobs found. Create a new one instead.</p>
                  ) : (
                    <>
                      <button onClick={() => setSelectedJobId(null)}
                        className={cn("w-full text-left p-3 rounded-xl text-sm transition-colors",
                          selectedJobId === null ? "bg-primary/10 text-primary font-bold border border-primary/20" : "bg-[#FAFAFA] dark:bg-muted text-muted-foreground")}
                        data-testid="button-no-job">
                        No linked job (standalone quote)
                      </button>
                      {jobs.map(job => (
                        <button key={job.id} onClick={() => setSelectedJobId(job.id)}
                          className={cn("w-full text-left p-3 rounded-xl text-sm transition-colors",
                            selectedJobId === job.id ? "bg-primary/10 text-primary font-bold border border-primary/20" : "bg-[#FAFAFA] dark:bg-muted text-foreground")}
                          data-testid={`button-job-${job.id}`}>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 shrink-0" />
                            <span className="truncate">{job.title}</span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}

              {jobMode === "new" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Job Title</Label>
                  <Input value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="e.g. Kitchen Renovation" className="rounded-xl h-12"
                    data-testid="input-new-job-title" />
                </div>
              )}
            </div>

            <Button onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending || !ackChecked || (jobMode === "new" && !newJobTitle.trim())}
              className="w-full h-14 rounded-2xl font-bold bg-green-600 text-white disabled:opacity-40"
              data-testid="button-confirm-finalize">
              {finalizeMutation.isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Save & Finalize</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
