import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { InvoiceDocument } from "@/pages/InvoicePreview";

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
  const settled = data.invoice.status === "paid";
  return (
    <>
      {payUrl && !settled ? (
        <div className="print:hidden bg-white border-b px-4 py-3 text-center">
          <a href={payUrl} className="inline-block rounded-xl bg-black text-white px-5 py-2.5 font-semibold" rel="noopener">
            Pay by card
          </a>
        </div>
      ) : null}
      <InvoiceDocument invoice={data.invoice} customer={data.customer} settings={data.business} />
    </>
  );
}
