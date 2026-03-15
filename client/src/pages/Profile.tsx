import { useAuth } from "@/hooks/use-auth";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { useState, useEffect, useRef } from "react";
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
  Target
} from "lucide-react";
import { getWeeklyGoal, setWeeklyGoal } from "@/components/WeeklyRevenueGoalWidget";

const TRADE_TYPES = [
  "General", "Plumber", "Electrician", "Carpenter", "Painter",
  "Tiler", "Landscaper", "Roofer", "Concreter", "Bricklayer",
  "HVAC", "Locksmith", "Handyman"
];

const BLADE_METADATA: Record<string, { label: string; desc: string }> = {
  hero: { label: "AI Quoting", desc: "Hero section for AI quotes" },
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

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { data: dbSettings } = useUserSettings();
  const { mutate: updateSettings, mutateAsync: updateSettingsAsync } = useUpdateUserSettings();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const isInitialized = useRef(false);

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
    // Keep localStorage in sync for other consumers
    localStorage.setItem("vargenezey_business_profile", JSON.stringify(bp));
    localStorage.setItem("vargenezey_quote_defaults", JSON.stringify(qd));
    localStorage.setItem("vargenezey_dark_mode", String(dbSettings.darkMode ?? false));
    // Mark as initialized so dark mode effect can safely save from now on
    isInitialized.current = true;
  }, [dbSettings?.userId]);

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
