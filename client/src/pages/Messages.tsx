import { useState, useMemo } from "react";
import { MessageCircle, Search, Phone, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/hooks/use-customers";
import { useJobs } from "@/hooks/use-jobs";
import { MESSAGE_TEMPLATES } from "@/lib/message-templates";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Messages() {
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("quote_ready");

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      const res = await fetch("/api/messages/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (!res.ok) throw new Error("Failed to send email");
    },
    onSuccess: () => toast({ title: "Email sent!" }),
    onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
  });

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];

    const withLastJob = customers
      .filter((c) => c.phone || c.email)
      .map((c) => {
        const customerJobs = jobs?.filter((j) => j.customerId === c.id) ?? [];
        const lastJob = customerJobs.sort((a, b) => {
          const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
          const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
          return bDate - aDate;
        })[0];
        return { customer: c, lastJob };
      });

    return withLastJob.sort((a, b) => {
      const aDate = a.lastJob?.scheduledDate ? new Date(a.lastJob.scheduledDate).getTime() : 0;
      const bDate = b.lastJob?.scheduledDate ? new Date(b.lastJob.scheduledDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [customers, jobs]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedCustomers;
    const q = search.toLowerCase();
    return sortedCustomers.filter(
      ({ customer, lastJob }) =>
        customer.name.toLowerCase().includes(q) ||
        lastJob?.title?.toLowerCase().includes(q)
    );
  }, [sortedCustomers, search]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-12 mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-1">Messages</h1>
        <p className="text-muted-foreground">Quick contact your clients</p>
      </div>

      <div className="px-6 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-12 h-12 rounded-2xl border-black/10 bg-white dark:bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-messages"
          />
        </div>
      </div>

      <div className="px-6 space-y-3">
        {filtered.length === 0 && (
          <div className="bg-white dark:bg-card rounded-[2rem] p-10 shadow-sm border border-black/5 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Customers Found</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Add customers with a phone number or email to contact them here.
            </p>
          </div>
        )}

        {filtered.map(({ customer, lastJob }) => {
          const isExpanded = expandedId === customer.id;
          const template = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplate) ?? MESSAGE_TEMPLATES[0];
          const smsBody = template.body(customer.name.split(" ")[0]);
          const emailSubject = template.subject(customer.name.split(" ")[0]);
          const emailBody = template.body(customer.name.split(" ")[0]);

          return (
            <div
              key={customer.id}
              className="bg-white dark:bg-card rounded-3xl shadow-sm border border-black/5 overflow-hidden"
            >
              {/* Collapsed row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                data-testid={`customer-row-${customer.id}`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">{getInitials(customer.name)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{customer.name}</p>
                  {lastJob ? (
                    <p className="text-sm text-muted-foreground truncate">{lastJob.title}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No jobs yet</p>
                  )}
                </div>

                {/* Quick action icons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {customer.phone && (
                    <a
                      href={`sms:${customer.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      data-testid={`btn-sms-quick-${customer.id}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {customer.email && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const t = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplate) ?? MESSAGE_TEMPLATES[0];
                        sendEmailMutation.mutate({
                          to: customer.email!,
                          subject: t.subject(customer.name.split(" ")[0]),
                          body: t.body(customer.name.split(" ")[0]),
                        });
                      }}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition-colors"
                      data-testid={`btn-email-quick-${customer.id}`}
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
                  )}
                </div>
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="px-5 pb-5 border-t border-black/5 pt-4 space-y-4">
                  {/* Template pills */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Message Template
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {MESSAGE_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTemplate(t.id)}
                          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                            selectedTemplate === t.id
                              ? "bg-primary text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                          }`}
                          data-testid={`template-pill-${t.id}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message preview */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {smsBody}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    {customer.phone && (
                      <a
                        href={`sms:${customer.phone}?body=${encodeURIComponent(smsBody)}`}
                        className="flex-1"
                        data-testid={`btn-send-sms-${customer.id}`}
                      >
                        <Button className="w-full rounded-xl h-11 bg-primary font-semibold">
                          <Phone className="w-4 h-4 mr-2" />
                          Send SMS
                        </Button>
                      </a>
                    )}
                    {customer.email && (
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-11 font-semibold border-2"
                        disabled={sendEmailMutation.isPending}
                        onClick={() => sendEmailMutation.mutate({ to: customer.email!, subject: emailSubject, body: emailBody })}
                        data-testid={`btn-send-email-${customer.id}`}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {sendEmailMutation.isPending ? "Sending…" : "Send Email"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
