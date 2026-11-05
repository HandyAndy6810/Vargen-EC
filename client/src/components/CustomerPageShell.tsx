import type { ReactNode } from "react";

/**
 * The frame for the pages a customer opens from a link (round 2, p7): the quote
 * portal (/portal/:token) and the invoice page (/invoice/:token). The app's look
 * — Host Grotesk, the orange, a soft gradient behind the header — with the
 * tradie's logo and business name first, because that's who the customer knows.
 * Laid out for a phone first; it widens to a column on a desktop.
 */
export const ORANGE = "#F26A2A";
export const FONT = "'Host Grotesk', 'Manrope', system-ui, -apple-system, sans-serif";

export function CustomerPageShell({
  logoUrl, businessName, eyebrow, title, meta, children,
}: {
  logoUrl?: string | null;
  businessName?: string | null;
  /** "Quote Q-0042" or "Invoice INV-0042". */
  eyebrow: string;
  /** The headline: usually the job, or the amount. */
  title?: ReactNode;
  /** A line under the title: dates. */
  meta?: ReactNode;
  children: ReactNode;
}) {
  const name = (businessName || "").trim();
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "•";
  return (
    <div className="min-h-screen" style={{ fontFamily: FONT, background: "#F2F2F0", color: "#1C1D21" }}>
      <header
        className="print:hidden"
        style={{
          // Orange mixed into the page, as the app's soft gradient (50/26/7/0%).
          background: "linear-gradient(180deg, #F2AE8D 0%, #F2C9B4 30%, #F2E5DE 64%, #F2F2F0 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-5 pt-8 pb-10">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name ? `${name} logo` : "Logo"}
                className="h-14 max-w-[160px] object-contain rounded-xl bg-white/70 p-1.5"
              />
            ) : (
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-extrabold"
                style={{ background: "#1C1D21", color: ORANGE }}
                aria-hidden
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xl font-extrabold leading-tight tracking-tight truncate" data-testid="text-business-name">
                {name || "Your tradie"}
              </p>
              <p className="text-sm font-semibold" style={{ color: "rgba(28,29,33,0.82)" }}>{eyebrow}</p>
            </div>
          </div>
          {title ? <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">{title}</h1> : null}
          {meta ? <div className="mt-2 text-sm font-semibold" style={{ color: "rgba(28,29,33,0.82)" }}>{meta}</div> : null}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 -mt-4 pb-12 space-y-3">{children}</main>
    </div>
  );
}

/** A white "Rim" card, as on the app's Home. */
export function Card({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section
      className={`bg-white/90 rounded-[22px] p-5 ${className}`}
      style={{ border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 20px rgba(20,20,22,0.06)" }}
    >
      {label ? <p className="text-[13px] font-bold mb-2" style={{ color: "rgba(28,29,33,0.66)" }}>{label}</p> : null}
      {children}
    </section>
  );
}
