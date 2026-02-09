import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
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
} from "lucide-react";

const TRADE_TYPES = [
  "General", "Plumber", "Electrician", "Carpenter", "Painter",
  "Tiler", "Landscaper", "Roofer", "Concreter", "Bricklayer",
  "HVAC", "Locksmith", "Handyman"
];

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

  const [activeSection, setActiveSection] = useState<string | null>(null);

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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("vargenezey_dark_mode", String(darkMode));
  }, [darkMode]);

  const saveBusiness = () => {
    localStorage.setItem("vargenezey_business_profile", JSON.stringify(business));
    toast({ title: "Business profile saved" });
    setActiveSection(null);
  };

  const saveQuoteDefaults = () => {
    localStorage.setItem("vargenezey_quote_defaults", JSON.stringify(quoteDefaults));
    toast({ title: "Quote defaults saved" });
    setActiveSection(null);
  };

  const menuItems = [
    { id: "business", icon: Building2, label: "Business Profile", desc: "Name, ABN, contact details" },
    { id: "quoteDefaults", icon: DollarSign, label: "Quote Defaults", desc: "Trade, rates, markup, GST" },
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
