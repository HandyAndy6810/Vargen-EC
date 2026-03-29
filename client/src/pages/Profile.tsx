import { useAuth } from "@/hooks/use-auth";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useXeroStatus, useXeroDisconnect, useXeroSyncAllCustomers } from "@/hooks/use-xero";
import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  UserRound,
  Building2,
  Briefcase,
  DollarSign,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Save,
  Phone,
  Mail,
  MapPin,
  Hash,
  Layout,
  ArrowUp,
  ArrowDown,
  Target,
  Link2,
  Unlink,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Clock,
  Palette,
  Upload,
  Image,
} from "lucide-react";
import { getWeeklyGoal, setWeeklyGoal } from "@/components/WeeklyRevenueGoalWidget";

const TRADE_TYPES = [
  "General", "Plumber", "Electrician", "Carpenter", "Painter",
  "Tiler", "Landscaper", "Roofer", "Concreter", "Bricklayer",
  "HVAC", "Locksmith", "Handyman"
];

const BLADE_METADATA: Record<string, { label: string; desc: string }> = {
  hero: { label: "AI Quoting", desc: "Hero section for AI quotes" },
  activity: { label: "Recent Activity", desc: "Activity feed & quick templates" },
  stats: { label: "Quick Stats", desc: "Pending quotes & upcoming jobs" },
  pipeline: { label: "Quote Pipeline", desc: "Quotes by status overview" },
  actions: { label: "Quick Actions", desc: "Common shortcuts" },
  revenue: { label: "Weekly Revenue Goal", desc: "Progress toward your weekly target" },
  calendar: { label: "Weekly Calendar", desc: "Next 7 days overview" },
};

const ALL_BLADE_IDS = Object.keys(BLADE_METADATA);

/** Ensure every blade in BLADE_METADATA appears in the order array */
function normalizeBladeOrder(order: string[]): string[] {
  const known = order.filter((id) => id in BLADE_METADATA);
  const missing = ALL_BLADE_IDS.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

interface BusinessProfile {
  businessName: string;
  abn: string;
  phone: string;
  email: string;
  address: string;
}

interface QuoteDefaults {
  tradeType: string;
  labourRate: number;
  markupPercent: number;
  callOutFee: number;
  callOutFeeEnabled: boolean;
  includeGST: boolean;
}

interface QuoteBranding {
  accentColor: string;
  fontFamily: string;
  logoUrl: string;
  headerStyle: string;
}

const PRESET_COLORS = [
  { label: "Orange", value: "#ea580c" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#16a34a" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Red", value: "#dc2626" },
  { label: "Teal", value: "#0891b2" },
  { label: "Slate", value: "#475569" },
  { label: "Black", value: "#111827" },
];

const FONT_OPTIONS = [
  { value: "inter", label: "Inter", preview: "Modern & Clean" },
  { value: "poppins", label: "Poppins", preview: "Rounded & Friendly" },
  { value: "roboto", label: "Roboto", preview: "Professional" },
  { value: "lato", label: "Lato", preview: "Elegant & Light" },
  { value: "playfair", label: "Playfair Display", preview: "Classic Serif" },
];

const HEADER_STYLES = [
  { value: "gradient", label: "Gradient" },
  { value: "solid", label: "Solid" },
  { value: "minimal", label: "Minimal" },
];

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { data: dbSettings } = useUserSettings();
  const { mutate: updateSettings, mutateAsync: updateSettingsAsync } = useUpdateUserSettings();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const isInitialized = useRef(false);

  // Xero connection
  const { data: xeroStatus, isLoading: xeroLoading } = useXeroStatus();
  const { mutateAsync: disconnectXero, isPending: disconnecting } = useXeroDisconnect();
  const { mutate: syncAllCustomers, isPending: syncingAll } = useXeroSyncAllCustomers();
  const searchString = useSearch();

  // Handle Xero OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const xeroResult = params.get("xero");
    if (xeroResult === "success") {
      toast({ title: "Xero connected!", description: "Your Xero account is now linked." });
      // Clean the URL
      window.history.replaceState({}, "", "/profile");
    } else if (xeroResult === "error") {
      const reason = params.get("reason") || "unknown";
      const messages: Record<string, string> = {
        unauthorized: "You must be logged in to connect Xero.",
        missing_code: "Authorization was cancelled or failed.",
        invalid_state: "Security check failed. Please try again.",
        no_tenants: "No Xero organisations found. Make sure you have a Xero account.",
        token_exchange: "Failed to complete Xero authorization. Please try again.",
        not_configured: "Xero is not configured on this server. Set XERO_CLIENT_ID and XERO_REDIRECT_URI environment variables.",
        server_error: "A server error occurred while starting the Xero connection. Check server logs.",
      };
      toast({
        title: "Xero connection failed",
        description: messages[reason] || "An unknown error occurred.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/profile");
    }
  }, [searchString, toast]);

  const [bladeOrder, setBladeOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem("vargenezey_home_blade_order");
    return normalizeBladeOrder(saved ? JSON.parse(saved) : ["hero", "pipeline", "actions", "revenue", "stats", "calendar"]);
  });

  const [business, setBusiness] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem("vargenezey_business_profile");
    return saved ? JSON.parse(saved) : {
      businessName: "",
      abn: "",
      phone: "",
      email: user?.email || "",
      address: "",
    };
  });

  const [quoteDefaults, setQuoteDefaults] = useState<QuoteDefaults>(() => {
    const saved = localStorage.getItem("vargenezey_quote_defaults");
    return saved ? JSON.parse(saved) : {
      tradeType: "General",
      labourRate: 85,
      markupPercent: 15,
      callOutFee: 80,
      callOutFeeEnabled: false,
      includeGST: true,
    };
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("vargenezey_dark_mode") === "true";
  });

  const [weeklyGoalInput, setWeeklyGoalInput] = useState<string>(() => {
    const v = getWeeklyGoal();
    return v > 0 ? String(v) : "";
  });

  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountName: "",
    bsb: "",
    accountNumber: "",
    paymentTermsDays: 14,
  });

  const [followUpSettings, setFollowUpSettings] = useState({
    followUpEnabled: false,
    followUpDays: "[3,7,14]",
    followUpChannel: "sms",
  });

  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const [branding, setBranding] = useState<QuoteBranding>({
    accentColor: "#ea580c",
    fontFamily: "inter",
    logoUrl: "",
    headerStyle: "gradient",
  });

  const saveBankDetails = async () => {
    setIsSavingBank(true);
    try {
      await updateSettingsAsync({
        bankName: bankDetails.bankName,
        accountName: bankDetails.accountName,
        bsb: bankDetails.bsb,
        accountNumber: bankDetails.accountNumber,
        paymentTermsDays: bankDetails.paymentTermsDays,
      });
      toast({ title: "Bank details saved" });
      setActiveSection(null);
    } catch { /* error toast handled by mutation */ }
    setIsSavingBank(false);
  };

  const saveFollowUpSettings = async () => {
    setIsSavingFollowUp(true);
    try {
      await updateSettingsAsync({
        followUpEnabled: followUpSettings.followUpEnabled,
        followUpDays: followUpSettings.followUpDays,
        followUpChannel: followUpSettings.followUpChannel,
      });
      toast({ title: "Follow-up settings saved" });
      setActiveSection(null);
    } catch { /* error toast handled by mutation */ }
    setIsSavingFollowUp(false);
  };

  const saveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await updateSettingsAsync({
        quoteAccentColor: branding.accentColor,
        quoteFontFamily: branding.fontFamily,
        logoUrl: branding.logoUrl,
        quoteHeaderStyle: branding.headerStyle,
      });
      toast({ title: "Quote branding saved" });
      setActiveSection(null);
    } catch { /* error toast handled by mutation */ }
    setIsSavingBranding(false);
  };

  const saveGoals = async () => {
    const parsed = Number(weeklyGoalInput);
    const goal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setWeeklyGoal(goal);
    try {
      await updateSettingsAsync({ weeklyGoal: goal });
      toast({ title: "Goals saved" });
      setActiveSection(null);
    } catch { /* error toast handled by mutation */ }
    window.dispatchEvent(new Event("storage"));
  };

  // Sync DB → state + localStorage when settings arrive
  useEffect(() => {
    if (!dbSettings) return;
    const bp = {
      businessName: dbSettings.businessName ?? "",
      abn: dbSettings.abn ?? "",
      phone: dbSettings.phone ?? "",
      email: dbSettings.email ?? "",
      address: dbSettings.address ?? "",
    };
    const qd = {
      tradeType: dbSettings.tradeType ?? "General",
      labourRate: dbSettings.labourRate ?? 85,
      markupPercent: dbSettings.markupPercent ?? 15,
      callOutFee: dbSettings.callOutFee ?? 80,
      callOutFeeEnabled: dbSettings.callOutFeeEnabled ?? false,
      includeGST: dbSettings.includeGST ?? true,
    };
    setBusiness(bp);
    setQuoteDefaults(qd);
    setDarkMode(dbSettings.darkMode ?? false);
    if (dbSettings.weeklyGoal) setWeeklyGoalInput(String(dbSettings.weeklyGoal));
    if (dbSettings.bladeOrder) {
      setBladeOrder(normalizeBladeOrder(JSON.parse(dbSettings.bladeOrder)));
    }
    setBankDetails({
      bankName: dbSettings.bankName ?? "",
      accountName: dbSettings.accountName ?? "",
      bsb: dbSettings.bsb ?? "",
      accountNumber: dbSettings.accountNumber ?? "",
      paymentTermsDays: dbSettings.paymentTermsDays ?? 14,
    });
    setBranding({
      accentColor: dbSettings.quoteAccentColor ?? "#ea580c",
      fontFamily: dbSettings.quoteFontFamily ?? "inter",
      logoUrl: dbSettings.logoUrl ?? "",
      headerStyle: dbSettings.quoteHeaderStyle ?? "gradient",
    });
    setFollowUpSettings({
      followUpEnabled: dbSettings.followUpEnabled ?? false,
      followUpDays: dbSettings.followUpDays ?? "[3,7,14]",
      followUpChannel: dbSettings.followUpChannel ?? "sms",
    });
    // Keep localStorage in sync for other consumers
    localStorage.setItem("vargenezey_business_profile", JSON.stringify(bp));
    localStorage.setItem("vargenezey_quote_defaults", JSON.stringify(qd));
    localStorage.setItem("vargenezey_dark_mode", String(dbSettings.darkMode ?? false));
    // Mark as initialized so dark mode effect can safely save from now on
    isInitialized.current = true;
  }, [dbSettings]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("vargenezey_dark_mode", String(darkMode));
    // Only save to DB after initial sync is done, to avoid 401 race on mount
    if (isInitialized.current) {
      updateSettings({ darkMode });
    }
  }, [darkMode]);

  const saveBusiness = async () => {
    localStorage.setItem("vargenezey_business_profile", JSON.stringify(business));
    try {
      await updateSettingsAsync({
        businessName: business.businessName,
        abn: business.abn,
        phone: business.phone,
        email: business.email,
        address: business.address,
      });
      toast({ title: "Business profile saved" });
      setActiveSection(null);
    } catch { /* error toast handled by mutation */ }
  };

  const saveQuoteDefaults = async () => {
    localStorage.setItem("vargenezey_quote_defaults", JSON.stringify(quoteDefaults));
    try {
      await updateSettingsAsync({
        tradeType: quoteDefaults.tradeType,
        labourRate: quoteDefaults.labourRate,
        markupPercent: quoteDefaults.markupPercent,
        callOutFee: quoteDefaults.callOutFee,
        callOutFeeEnabled: quoteDefaults.callOutFeeEnabled,
        includeGST: quoteDefaults.includeGST,
      });
      toast({ title: "Quote defaults saved" });
      setActiveSection(null);
    } catch { /* error toast handled by mutation */ }
  };

  const moveBlade = async (index: number, direction: 'up' | 'down') => {
    const newOrder = [...bladeOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setBladeOrder(newOrder);
      localStorage.setItem("vargenezey_home_blade_order", JSON.stringify(newOrder));
      window.dispatchEvent(new Event('storage'));
      try {
        await updateSettingsAsync({ bladeOrder: JSON.stringify(newOrder) });
        toast({ title: "Dashboard layout updated" });
      } catch { /* error toast handled by mutation */ }
    }
  };

  const menuItems = [
    { id: "business", icon: Building2, label: "Business Profile", desc: "Name, ABN, contact details" },
    { id: "quoteDefaults", icon: DollarSign, label: "Quote Defaults", desc: "Trade, rates, markup, GST" },
    { id: "goals", icon: Target, label: "Goals", desc: "Weekly revenue target" },
    { id: "homeLayout", icon: Layout, label: "Home Layout", desc: "Change the stack of dashboard items" },
    { id: "appearance", icon: darkMode ? Moon : Sun, label: "Appearance", desc: darkMode ? "Dark mode" : "Light mode" },
    { id: "branding", icon: Palette, label: "Quote Branding", desc: "Logo, colours, fonts & header style" },
    { id: "bank", icon: Building2, label: "Bank Details", desc: "For invoicing — BSB, account number" },
    { id: "followups", icon: Clock, label: "Follow-Up Automation", desc: dbSettings?.followUpEnabled ? "Enabled" : "Disabled" },
    { id: "xero", icon: Link2, label: "Xero Integration", desc: xeroStatus?.connected ? `Connected to ${xeroStatus.tenantName}` : "Connect your accounting" },
  ];

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-12 mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground">Configure your app</p>
      </div>

      <div className="px-6 space-y-4 max-w-2xl mx-auto">
        {/* User Info Card */}
        <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserRound className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg truncate" data-testid="text-profile-name">
              {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Tradie"}
            </p>
            <p className="text-sm text-muted-foreground truncate" data-testid="text-profile-email">{user?.email || "No email"}</p>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="bg-white dark:bg-white/5 rounded-[2rem] shadow-sm border border-black/5 dark:border-white/10 overflow-hidden">
          {menuItems.map((item, idx) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (item.id === "appearance") {
                  setDarkMode(!darkMode);
                } else {
                  setActiveSection(activeSection === item.id ? null : item.id);
                }
              }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
              className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors cursor-pointer ${idx < menuItems.length - 1 ? "border-b border-black/5 dark:border-white/10" : ""}`}
              data-testid={`button-settings-${item.id}`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              {item.id === "appearance" ? (
                <Switch checked={darkMode} onCheckedChange={setDarkMode} data-testid="switch-dark-mode" />
              ) : (
                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${activeSection === item.id ? "rotate-90" : ""}`} />
              )}
            </div>
          ))}
        </div>

        {/* Business Profile Expanded */}
        {activeSection === "business" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Business Profile
            </h3>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-3.5 h-3.5" /> Business Name
                </Label>
                <Input value={business.businessName} onChange={(e) => setBusiness(p => ({ ...p, businessName: e.target.value }))}
                  placeholder="e.g. Smith Plumbing" className="rounded-xl h-12 border-black/10"
                  data-testid="input-business-name" />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Hash className="w-3.5 h-3.5" /> ABN
                </Label>
                <Input value={business.abn} onChange={(e) => setBusiness(p => ({ ...p, abn: e.target.value }))}
                  placeholder="e.g. 12 345 678 901" className="rounded-xl h-12 border-black/10"
                  data-testid="input-business-abn" />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </Label>
                <Input value={business.phone} onChange={(e) => setBusiness(p => ({ ...p, phone: e.target.value }))}
                  placeholder="e.g. 0412 345 678" className="rounded-xl h-12 border-black/10"
                  data-testid="input-business-phone" />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input value={business.email} onChange={(e) => setBusiness(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. info@smithplumbing.com.au" className="rounded-xl h-12 border-black/10"
                  data-testid="input-business-email" />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Address
                </Label>
                <Input value={business.address} onChange={(e) => setBusiness(p => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. 123 Trade St, Melbourne VIC" className="rounded-xl h-12 border-black/10"
                  data-testid="input-business-address" />
              </div>
            </div>

            <Button onClick={saveBusiness} className="w-full h-12 rounded-xl font-bold" data-testid="button-save-business">
              <Save className="w-4 h-4 mr-2" /> Save Business Profile
            </Button>
          </div>
        )}

        {/* Quote Defaults Expanded */}
        {activeSection === "quoteDefaults" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Quote Defaults
            </h3>

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-1">Trade Type</Label>
                <Select value={quoteDefaults.tradeType} onValueChange={(v) => setQuoteDefaults(p => ({ ...p, tradeType: v }))}>
                  <SelectTrigger className="rounded-xl h-12 border-black/10" data-testid="select-default-trade">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-muted-foreground mb-1">Labour Rate ($/hr)</Label>
                  <Input type="number" value={quoteDefaults.labourRate}
                    onChange={(e) => setQuoteDefaults(p => ({ ...p, labourRate: Number(e.target.value) }))}
                    className="rounded-xl h-12 border-black/10"
                    data-testid="input-default-labour-rate" />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-muted-foreground mb-1">Markup %</Label>
                  <Input type="number" value={quoteDefaults.markupPercent}
                    onChange={(e) => setQuoteDefaults(p => ({ ...p, markupPercent: Number(e.target.value) }))}
                    className="rounded-xl h-12 border-black/10"
                    data-testid="input-default-markup" />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label className="text-sm font-medium text-foreground">Call-Out Fee</Label>
                <Switch checked={quoteDefaults.callOutFeeEnabled}
                  onCheckedChange={(v) => setQuoteDefaults(p => ({ ...p, callOutFeeEnabled: v }))}
                  data-testid="switch-default-callout" />
              </div>
              {quoteDefaults.callOutFeeEnabled && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-1">Call-Out Fee Amount ($)</Label>
                  <Input type="number" value={quoteDefaults.callOutFee}
                    onChange={(e) => setQuoteDefaults(p => ({ ...p, callOutFee: Number(e.target.value) }))}
                    className="rounded-xl h-12 border-black/10"
                    data-testid="input-default-callout-fee" />
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <Label className="text-sm font-medium text-foreground">Include GST (10%)</Label>
                <Switch checked={quoteDefaults.includeGST}
                  onCheckedChange={(v) => setQuoteDefaults(p => ({ ...p, includeGST: v }))}
                  data-testid="switch-default-gst" />
              </div>
            </div>

            <Button onClick={saveQuoteDefaults} className="w-full h-12 rounded-xl font-bold" data-testid="button-save-quote-defaults">
              <Save className="w-4 h-4 mr-2" /> Save Quote Defaults
            </Button>
          </div>
        )}

        {/* Goals Expanded */}
        {activeSection === "goals" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Goals
            </h3>
            <p className="text-sm text-muted-foreground -mt-1">
              Set a weekly revenue target to track your progress on the dashboard.
            </p>

            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5" /> Weekly Revenue Goal ($)
              </Label>
              <Input
                type="number"
                value={weeklyGoalInput}
                onChange={(e) => setWeeklyGoalInput(e.target.value)}
                placeholder="e.g. 3500"
                className="rounded-xl h-12 border-black/10"
                data-testid="input-weekly-goal"
              />
              <p className="text-xs text-muted-foreground mt-1.5 px-1">
                Set to 0 to hide the widget. Based on accepted quotes this week.
              </p>
            </div>

            <Button onClick={saveGoals} className="w-full h-12 rounded-xl font-bold" data-testid="button-save-goals">
              <Save className="w-4 h-4 mr-2" /> Save Goals
            </Button>
          </div>
        )}

        {/* Home Layout Expanded */}
        {activeSection === "homeLayout" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Layout className="w-5 h-5 text-primary" /> Home Layout
            </h3>
            <p className="text-sm text-muted-foreground mb-4 px-1">
              Reorder the sections displayed on your home screen by using the arrows.
            </p>

            <div className="space-y-3">
              {bladeOrder.map((bladeId, index) => {
                const metadata = BLADE_METADATA[bladeId as keyof typeof BLADE_METADATA];
                return (
                  <div 
                    key={bladeId} 
                    className="flex items-center gap-4 p-4 bg-[#F5F3F0] dark:bg-white/5 rounded-2xl border border-black/5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{metadata.label}</p>
                      <p className="text-[10px] text-muted-foreground">{metadata.desc}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        disabled={index === 0}
                        onClick={() => moveBlade(index, 'up')}
                        className="w-8 h-8 rounded-lg hover:bg-black/5"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        disabled={index === bladeOrder.length - 1}
                        onClick={() => moveBlade(index, 'down')}
                        className="w-8 h-8 rounded-lg hover:bg-black/5"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quote Branding Expanded */}
        {activeSection === "branding" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-6 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Quote Branding
            </h3>

            {/* Mini preview */}
            <div className="rounded-xl overflow-hidden border border-black/10 shadow-sm">
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{
                  background: branding.headerStyle === "gradient"
                    ? `linear-gradient(135deg, ${branding.accentColor}, ${branding.accentColor}aa)`
                    : branding.headerStyle === "minimal"
                    ? "#f8f8f8"
                    : branding.accentColor,
                }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: branding.headerStyle === "minimal" ? branding.accentColor : "#fff" }}>QUOTE</p>
                  <p className="text-xs" style={{ color: branding.headerStyle === "minimal" ? `${branding.accentColor}99` : "rgba(255,255,255,0.7)" }}>Q-0001</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="logo" className="h-8 max-w-[80px] object-contain"
                      style={{ filter: branding.headerStyle === "minimal" ? "none" : "brightness(0) invert(1)" }} />
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: branding.headerStyle === "minimal" ? branding.accentColor : "rgba(255,255,255,0.2)", color: branding.headerStyle === "minimal" ? "#fff" : "#fff" }}>
                      {(dbSettings?.businessName || "YB").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                  )}
                  <p className="text-xs font-semibold" style={{ color: branding.headerStyle === "minimal" ? branding.accentColor : "#fff" }}>
                    {dbSettings?.businessName || "Your Business"}
                  </p>
                </div>
              </div>
              <div className="bg-white px-5 py-3 text-xs text-gray-500">Line items, totals &amp; terms appear below…</div>
            </div>

            {/* Logo Upload */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
                <Image className="w-3.5 h-3.5" /> Logo
              </Label>
              <div className="flex items-center gap-3">
                {branding.logoUrl ? (
                  <div className="relative w-16 h-16 rounded-xl border border-black/10 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={branding.logoUrl} alt="logo" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => setBranding(p => ({ ...p, logoUrl: "" }))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center"
                    >×</button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-black/20 flex items-center justify-center bg-gray-50 text-muted-foreground">
                    <Image className="w-6 h-6 opacity-40" />
                  </div>
                )}
                <div className="flex-1">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/10 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-foreground">
                      <Upload className="w-4 h-4" />
                      {branding.logoUrl ? "Replace Logo" : "Upload Logo"}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setBranding(p => ({ ...p, logoUrl: reader.result as string }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1.5">PNG, JPG or SVG. Will appear in the quote header.</p>
                  {!branding.logoUrl && (
                    <p className="text-xs text-muted-foreground mt-0.5">No logo? Your initials will be used automatically.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Colour */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
                <Palette className="w-3.5 h-3.5" /> Brand Colour
              </Label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setBranding(p => ({ ...p, accentColor: c.value }))}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      background: c.value,
                      borderColor: branding.accentColor === c.value ? "#000" : "transparent",
                      transform: branding.accentColor === c.value ? "scale(1.2)" : "scale(1)",
                    }}
                    title={c.label}
                  />
                ))}
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-black/30 flex items-center justify-center cursor-pointer hover:border-black/60 transition-colors overflow-hidden" title="Custom colour">
                  <input
                    type="color"
                    value={branding.accentColor}
                    onChange={(e) => setBranding(p => ({ ...p, accentColor: e.target.value }))}
                    className="w-10 h-10 opacity-0 absolute cursor-pointer"
                  />
                  <span className="text-xs font-bold text-muted-foreground pointer-events-none">+</span>
                </label>
                <span className="text-xs text-muted-foreground font-mono">{branding.accentColor}</span>
              </div>
            </div>

            {/* Font */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">Font</Label>
              <div className="space-y-2">
                {FONT_OPTIONS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => setBranding(p => ({ ...p, fontFamily: f.value }))}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                      branding.fontFamily === f.value
                        ? "border-primary bg-primary/5"
                        : "border-black/10 bg-white dark:bg-white/5"
                    }`}
                  >
                    <span className="font-semibold text-sm text-foreground">{f.label}</span>
                    <span className="text-xs text-muted-foreground">{f.preview}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header Style */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-3 block">Header Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {HEADER_STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setBranding(p => ({ ...p, headerStyle: s.value }))}
                    className={`rounded-xl border-2 overflow-hidden transition-all ${
                      branding.headerStyle === s.value ? "border-primary" : "border-black/10"
                    }`}
                  >
                    <div
                      className="h-8"
                      style={{
                        background: s.value === "gradient"
                          ? `linear-gradient(135deg, ${branding.accentColor}, ${branding.accentColor}88)`
                          : s.value === "solid"
                          ? branding.accentColor
                          : "#f8f8f8",
                      }}
                    />
                    <p className="text-xs font-medium text-foreground py-1.5 bg-white dark:bg-white/5">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={saveBranding} disabled={isSavingBranding} className="w-full h-12 rounded-xl font-bold">
              {isSavingBranding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Branding
            </Button>
          </div>
        )}

        {/* Bank Details Expanded */}
        {activeSection === "bank" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Bank Details
            </h3>
            <p className="text-sm text-muted-foreground">These details appear on your invoices for client payment.</p>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Bank Name</Label>
                <Input
                  value={bankDetails.bankName}
                  onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  placeholder="Commonwealth Bank"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Account Name</Label>
                <Input
                  value={bankDetails.accountName}
                  onChange={e => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                  placeholder="John Smith Trading"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">BSB</Label>
                  <Input
                    value={bankDetails.bsb}
                    onChange={e => setBankDetails({ ...bankDetails, bsb: e.target.value })}
                    placeholder="062-000"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Account Number</Label>
                  <Input
                    value={bankDetails.accountNumber}
                    onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    placeholder="12345678"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Payment Terms (days)</Label>
                <Input
                  type="number"
                  value={bankDetails.paymentTermsDays}
                  onChange={e => setBankDetails({ ...bankDetails, paymentTermsDays: parseInt(e.target.value) || 14 })}
                  className="mt-1 rounded-xl w-32"
                />
              </div>
              <Button onClick={saveBankDetails} disabled={isSavingBank} className="w-full h-12 rounded-xl font-bold">
                {isSavingBank ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Bank Details
              </Button>
            </div>
          </div>
        )}

        {/* Follow-Up Settings Expanded */}
        {activeSection === "followups" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Follow-Up Automation
            </h3>
            <p className="text-sm text-muted-foreground">Automatically schedule follow-up reminders when you send a quote.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Follow-Ups</p>
                  <p className="text-sm text-muted-foreground">Get reminded to follow up on sent quotes</p>
                </div>
                <Switch
                  checked={followUpSettings.followUpEnabled}
                  onCheckedChange={(checked) => setFollowUpSettings({ ...followUpSettings, followUpEnabled: checked })}
                />
              </div>
              {followUpSettings.followUpEnabled && (
                <>
                  <div>
                    <Label className="text-sm font-medium">Follow-Up Days</Label>
                    <p className="text-xs text-muted-foreground mb-2">Days after sending a quote to trigger follow-ups</p>
                    <div className="flex gap-2 flex-wrap">
                      {(() => {
                        const days = (() => { try { return JSON.parse(followUpSettings.followUpDays); } catch { return [3, 7, 14]; } })();
                        return days.map((day: number, i: number) => (
                          <div key={i} className="flex items-center gap-1 bg-primary/10 rounded-full px-3 py-1">
                            <span className="text-sm font-medium">Day {day}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Default Channel</Label>
                    <Select
                      value={followUpSettings.followUpChannel}
                      onValueChange={(val) => setFollowUpSettings({ ...followUpSettings, followUpChannel: val })}
                    >
                      <SelectTrigger className="mt-1 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <Button onClick={saveFollowUpSettings} disabled={isSavingFollowUp} className="w-full h-12 rounded-xl font-bold">
                {isSavingFollowUp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Follow-Up Settings
              </Button>
            </div>
          </div>
        )}

        {/* Xero Integration Expanded */}
        {activeSection === "xero" && (
          <div className="bg-white dark:bg-white/5 rounded-[2rem] p-6 shadow-sm border border-black/5 dark:border-white/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" /> Xero Integration
            </h3>

            {xeroLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : xeroStatus?.connected ? (
              <div className="space-y-4">
                {/* Connected state */}
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-2xl border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-800 dark:text-green-300">Connected</p>
                    <p className="text-sm text-green-600 dark:text-green-400 truncate">
                      {xeroStatus.tenantName || "Xero Organisation"}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground px-1">
                  Your Xero account is linked. Customer contacts and invoices will sync with your Xero organisation.
                </p>

                <Button
                  onClick={() => syncAllCustomers()}
                  disabled={syncingAll}
                  className="w-full h-12 rounded-xl font-bold"
                  data-testid="button-xero-sync-all"
                >
                  {syncingAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4 mr-2" />
                  )}
                  Sync All Customers to Xero
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await disconnectXero();
                  }}
                  disabled={disconnecting}
                  className="w-full h-12 rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                  data-testid="button-xero-disconnect"
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4 mr-2" />
                  )}
                  Disconnect Xero
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Disconnected state */}
                <p className="text-sm text-muted-foreground px-1">
                  Connect your Xero account to automatically sync customers and create invoices from accepted quotes.
                </p>

                <div className="bg-[#F5F3F0] dark:bg-white/5 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What you get</p>
                  <ul className="text-sm text-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      Sync customers with Xero contacts
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      Create invoices from accepted quotes
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      Keep your books up to date automatically
                    </li>
                  </ul>
                </div>

                <a href="/api/xero/connect" className="block">
                  <Button
                    className="w-full h-12 rounded-xl font-bold bg-[#13B5EA] hover:bg-[#0FA1D1] text-white"
                    data-testid="button-xero-connect"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {user ? "Connect to Xero" : "Log in & Connect to Xero"}
                  </Button>
                </a>
                {!user && (
                  <p className="text-xs text-muted-foreground text-center px-1">
                    You'll be asked to sign in first, then taken straight to Xero.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={() => logout()}
          className="w-full bg-white dark:bg-white/5 rounded-[2rem] p-5 shadow-sm border border-black/5 dark:border-white/10 flex items-center justify-center gap-3 text-red-500 font-bold transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
      </div>
    </div>
  );
}
