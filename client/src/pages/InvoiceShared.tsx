import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { InvoiceDocument } from "@/pages/InvoicePreview";
import { CustomerPageShell, Card, ORANGE } from "@/components/CustomerPageShell";
import { format } from "date-fns";

/**
 * The customer's invoice link: /invoice/:token. Public, no login: it reads the
 * allowlisted view from /api/invoice-view/:token (server/lib/invoice-view.ts) and
 * renders the same document the tradie previews. The old /invoices/:id/preview link
 * needed the tradie's login, so customers following it saw "Invoice not found".
 */
export default function InvoiceShared() {
  const [, params] = useRoute("/invoice/:token");
  const token = params?.token || "";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/invoice-view", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`/api/invoice-view/${encodeURIComponent(token)}`);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
      </div>
    );
  }
  if (isError || !data?.invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-medium">This invoice link isn't valid.</p>
        <p className="text-sm text-muted-foreground mt-2">Ask the business that sent it for a new link.</p>
      </div>
    );
  }

  const payUrl: string | null = data.invoice.payByCardUrl;
  const inv = data.invoice;
  const settled = inv.status === "paid";
  const total = Number(inv.totalAmount) || 0;
  const owing = Math.max(0, total - (Number(inv.paidAmount) || 0));
  const money = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const due = inv.dueDate ? format(new Date(inv.dueDate), "d MMMM yyyy") : null;
  const overdue = !settled && inv.dueDate && new Date(inv.dueDate).getTime() < Date.now();
  return (
    <CustomerPageShell
      logoUrl={data.business?.logoUrl}
      businessName={data.business?.businessName}
      eyebrow={`Invoice ${inv.invoiceNumber || ""}`.trim()}
      title={settled ? "Paid. Thank you!" : money(owing)}
      meta={settled ? null : due ? <span style={overdue ? { color: "#B42318" } : undefined}>{overdue ? "Was due" : "Due"} {due}</span> : null}
    >
      {!settled ? (
        <Card className="print:hidden">
          {payUrl ? (
            <a
              href={payUrl}
              rel="noopener"
              className="w-full h-14 rounded-2xl text-lg font-extrabold text-white flex items-center justify-center"
              style={{ background: ORANGE }}
              data-testid="link-pay-by-card"
            >
              Pay {money(owing)} by card
            </a>
          ) : null}
          {data.business?.bsb || data.business?.accountNumber ? (
            <div className={payUrl ? "mt-4" : ""}>
              <p className="text-[13px] font-bold mb-1" style={{ color: "rgba(28,29,33,0.66)" }}>{payUrl ? "Or pay by bank transfer" : "Pay by bank transfer"}</p>
              <p className="text-[15px] leading-relaxed">
                {data.business.accountName ? <>{data.business.accountName}<br /></> : null}
                {data.business.bsb ? <>BSB <strong>{data.business.bsb}</strong>{"  "}</> : null}
                {data.business.accountNumber ? <>Account <strong>{data.business.accountNumber}</strong></> : null}
                {inv.invoiceNumber ? <><br />Reference: <strong>{inv.invoiceNumber}</strong></> : null}
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}
      <div className="rounded-[22px] overflow-hidden">
        <InvoiceDocument invoice={inv} customer={data.customer} settings={data.business} />
      </div>
    </CustomerPageShell>
  );
}
