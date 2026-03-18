import { useXeroStatus, useXeroSyncCustomer } from "@/hooks/use-xero";
import { useState, useMemo } from "react";
import {
  Search, Phone, Mail, ChevronDown, ChevronUp, Plus,
  Link2, CheckCircle2,
  UserPlus, Pencil, Trash2, MapPin, FileText, Briefcase,
  Save, X, Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/use-customers";
import { useJobs } from "@/hooks/use-jobs";
import { useQuotes } from "@/hooks/use-quotes";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { MESSAGE_TEMPLATES } from "@/lib/message-templates";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface EditForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export default function Contacts() {
  const { data: customers } = useCustomers();
  const { data: jobs } = useJobs();
  const { data: quotes } = useQuotes();
  const { toast } = useToast();

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const { data: xeroStatus } = useXeroStatus();
  const syncCustomer = useXeroSyncCustomer();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("quote_ready");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "", email: "", address: "", notes: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>({ name: "", phone: "", email: "", address: "", notes: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const sortedCustomers = useMemo(() => {
    if (!customers) return [];

    return customers.map((c) => {
      const customerJobs = jobs?.filter((j) => j.customerId === c.id) ?? [];
      const customerQuotes = quotes?.filter((q) => q.customerId === c.id) ?? [];
      const lastJob = customerJobs.sort((a, b) => {
        const aDate = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const bDate = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        return bDate - aDate;
      })[0];
      return { customer: c, lastJob, jobCount: customerJobs.length, quoteCount: customerQuotes.length };
    }).sort((a, b) => {
      const aDate = a.lastJob?.scheduledDate ? new Date(a.lastJob.scheduledDate).getTime() : 0;
      const bDate = b.lastJob?.scheduledDate ? new Date(b.lastJob.scheduledDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [customers, jobs, quotes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedCustomers;
    const q = search.toLowerCase();
    return sortedCustomers.filter(
      ({ customer }) =>
        customer.name.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q) ||
        customer.phone?.includes(q)
    );
  }, [sortedCustomers, search]);

  const startEdit = (c: typeof customers extends (infer T)[] | undefined ? T : never) => {
    if (!c) return;
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      notes: c.notes || "",
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    try {
      await updateCustomer.mutateAsync({
        id: editingId,
        data: {
          name: editForm.name,
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
          address: editForm.address || undefined,
          notes: editForm.notes || undefined,
        },
      });
      setEditingId(null);
    } catch { /* toast handled by hook */ }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    try {
      await createCustomer.mutateAsync({
        name: addForm.name,
        phone: addForm.phone || undefined,
        email: addForm.email || undefined,
        address: addForm.address || undefined,
        notes: addForm.notes || undefined,
      });
      setAddForm({ name: "", phone: "", email: "", address: "", notes: "" });
      setShowAddForm(false);
    } catch { /* toast handled by hook */ }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCustomer.mutateAsync(id);
      setConfirmDeleteId(null);
      setExpandedId(null);
      setEditingId(null);
    } catch { /* toast handled by hook */ }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="px-6 pt-12 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Contacts</h1>
            <p className="text-muted-foreground">Manage & message your clients</p>
          </div>
          <Button
            onClick={() => { setShowAddForm(!showAddForm); setExpandedId(null); setEditingId(null); }}
            className="rounded-xl h-10 px-4 font-semibold"
            data-testid="button-add-customer"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="px-6 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-12 h-12 rounded-2xl border-black/10 bg-white dark:bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-contacts"
          />
        </div>
      </div>

      <div className="px-6 space-y-3">
        {/* Add Customer Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-card rounded-3xl shadow-sm border-2 border-primary/20 p-5 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> New Customer
            </h3>
            <Input value={addForm.name} onChange={(e) => setAddForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Name *" className="rounded-xl h-11 border-black/10" data-testid="input-add-name" />
            <div className="flex gap-2">
              <Input value={addForm.phone} onChange={(e) => setAddForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Phone" className="rounded-xl h-11 border-black/10 flex-1" data-testid="input-add-phone" />
              <Input value={addForm.email} onChange={(e) => setAddForm(p => ({ ...p, email: e.target.value }))}
                placeholder="Email" className="rounded-xl h-11 border-black/10 flex-1" data-testid="input-add-email" />
            </div>
            <Input value={addForm.address} onChange={(e) => setAddForm(p => ({ ...p, address: e.target.value }))}
              placeholder="Address" className="rounded-xl h-11 border-black/10" data-testid="input-add-address" />
            <Textarea value={addForm.notes} onChange={(e) => setAddForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes (optional)" className="rounded-xl border-black/10 min-h-[60px]" data-testid="input-add-notes" />
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={!addForm.name.trim() || createCustomer.isPending}
                className="flex-1 rounded-xl h-11 font-semibold" data-testid="button-save-new-customer">
                <Save className="w-4 h-4 mr-2" /> Save Customer
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-xl h-11">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && !showAddForm && (
          <div className="bg-white dark:bg-card rounded-[2rem] p-10 shadow-sm border border-black/5 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {search.trim() ? "No Results" : "No Customers Yet"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-xs mb-4">
              {search.trim() ? "Try a different search term." : "Add your first customer to get started."}
            </p>
            {!search.trim() && (
              <Button onClick={() => setShowAddForm(true)} className="rounded-xl font-semibold">
                <UserPlus className="w-4 h-4 mr-2" /> Add Customer
              </Button>
            )}
          </div>
        )}

        {/* Customer list */}
        {filtered.map(({ customer, lastJob, jobCount, quoteCount }) => {
          const isExpanded = expandedId === customer.id;
          const isEditing = editingId === customer.id;
          const template = MESSAGE_TEMPLATES.find((t) => t.id === selectedTemplate) ?? MESSAGE_TEMPLATES[0];
          const firstName = customer.name.split(" ")[0];
          const smsBody = template.body(firstName);
          const emailSubject = template.subject(firstName);
          const emailBody = template.body(firstName);

          return (
            <div
              key={customer.id}
              className="bg-white dark:bg-card rounded-3xl shadow-sm border border-black/5 overflow-hidden"
            >
              {/* Collapsed row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                onClick={() => {
                  if (editingId === customer.id) return;
                  setExpandedId(isExpanded ? null : customer.id);
                  setEditingId(null);
                }}
                data-testid={`customer-row-${customer.id}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-sm">{getInitials(customer.name)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{customer.name}</p>
                  {lastJob ? (
                    <p className="text-sm text-muted-foreground truncate">{lastJob.title}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No jobs yet</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {customer.phone && (
                    <a href={`sms:${customer.phone}`} onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {xeroStatus?.connected && (
                    (customer as any).xeroContactId ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" title="Synced to Xero" />
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); syncCustomer.mutate(customer.id); }}
                        className="p-1.5 rounded-lg bg-[#13B5EA]/10 text-[#13B5EA] hover:bg-[#13B5EA]/20 transition-colors shrink-0"
                        title="Sync to Xero"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                    )
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

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Name *" className="rounded-xl h-11 border-black/10" />
                      <div className="flex gap-2">
                        <Input value={editForm.phone} onChange={(e) => setEditForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="Phone" className="rounded-xl h-11 border-black/10 flex-1" />
                        <Input value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))}
                          placeholder="Email" className="rounded-xl h-11 border-black/10 flex-1" />
                      </div>
                      <Input value={editForm.address} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))}
                        placeholder="Address" className="rounded-xl h-11 border-black/10" />
                      <Textarea value={editForm.notes} onChange={(e) => setEditForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Notes" className="rounded-xl border-black/10 min-h-[60px]" />
                      <div className="flex gap-2">
                        <Button onClick={saveEdit} disabled={!editForm.name.trim() || updateCustomer.isPending}
                          className="flex-1 rounded-xl h-10 font-semibold">
                          <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                        <Button variant="outline" onClick={() => setEditingId(null)} className="rounded-xl h-10">
                          Cancel
                        </Button>
                        {confirmDeleteId === customer.id ? (
                          <Button variant="destructive" onClick={() => handleDelete(customer.id)}
                            className="rounded-xl h-10 font-semibold">
                            Confirm Delete
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => setConfirmDeleteId(customer.id)}
                            className="rounded-xl h-10 text-red-500 border-red-200 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Contact details */}
                      <div className="space-y-2">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{customer.address}</span>
                          </div>
                        )}
                        {customer.notes && (
                          <div className="flex items-start gap-2 text-sm">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground">{customer.notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick links + edit */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(customer); }}
                          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-800 text-foreground hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {jobCount > 0 && (
                          <Link href={`/jobs?customerId=${customer.id}`}>
                            <span className="px-3 py-1.5 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer">
                              <Briefcase className="w-3 h-3" /> {jobCount} Job{jobCount !== 1 ? "s" : ""}
                            </span>
                          </Link>
                        )}
                        {quoteCount > 0 && (
                          <Link href="/quotes">
                            <span className="px-3 py-1.5 rounded-xl text-sm font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer">
                              <FileText className="w-3 h-3" /> {quoteCount} Quote{quoteCount !== 1 ? "s" : ""}
                            </span>
                          </Link>
                        )}
                      </div>

                      {/* Message templates */}
                      {(customer.phone || customer.email) && (
                        <>
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
                                >
                                  {t.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-3">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {smsBody}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            {customer.phone && (
                              <a href={`sms:${customer.phone}?body=${encodeURIComponent(smsBody)}`} className="flex-1">
                                <Button className="w-full rounded-xl h-11 bg-primary font-semibold">
                                  <Phone className="w-4 h-4 mr-2" /> Send SMS
                                </Button>
                              </a>
                            )}
                            {customer.email && (
                              <a href={`mailto:${customer.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} className="flex-1">
                                <Button variant="outline" className="w-full rounded-xl h-11 font-semibold border-2">
                                  <Mail className="w-4 h-4 mr-2" /> Send Email
                                </Button>
                              </a>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
