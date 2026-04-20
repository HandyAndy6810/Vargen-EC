// Invoices — list, detail, create.

function _InvoicesList() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const [filter, setFilter] = React.useState('all');
  const invs = [
    { id: 'INV-248', title: 'Hot water swap',     cust: 'Dalton', amt: 2004, status: 'sent',     age: 'Today' },
    { id: 'INV-247', title: 'Leaking tap fix',    cust: 'Chen',   amt: 320,  status: 'paid',     age: 'Yesterday' },
    { id: 'INV-246', title: 'Downlights x 8',     cust: 'Tanaka', amt: 1450, status: 'paid',     age: '2d' },
    { id: 'INV-245', title: 'Switchboard audit',  cust: 'Pearson',amt: 620,  status: 'overdue',  age: '14d · overdue' },
    { id: 'INV-244', title: 'Oven repair',        cust: 'Lowe',   amt: 420,  status: 'draft',    age: '—' },
    { id: 'INV-241', title: 'RCD install',        cust: 'Mak',    amt: 880,  status: 'overdue',  age: '21d · overdue' },
  ];
  const f = filter === 'all' ? invs : invs.filter(i => i.status === filter);
  return (
    <Screen nav="invoices">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 0' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Invoices</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.ink, letterSpacing: -0.5, marginTop: 2 }}>
            $ getting paid
          </div>
        </div>
        <button onClick={() => Nav && Nav('invoices-create')} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.orange, boxShadow: `0 6px 14px ${c.orange}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="plus" size={20} color="#fff" />
        </button>
      </div>

      {/* Cash hero */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          borderRadius: 22, padding: 20, position: 'relative', overflow: 'hidden',
          background: `linear-gradient(135deg, ${c.orange}, ${c.orangeDeep})`,
          color: '#fff',
          boxShadow: `0 18px 40px ${c.orange}55`,
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160,
            background: 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <Eyebrow color="rgba(255,255,255,0.8)">Outstanding · 8 invoices</Eyebrow>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.4, lineHeight: 1, marginTop: 6 }}>
            $4,840
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 11, fontWeight: 700 }}>
            <span>🔴 $1,500 overdue</span>
            <span>● $3,340 current</span>
          </div>
          {/* [anim: number counter up on mount] */}

          <button onClick={() => Nav && Nav('ai-entry')} style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
            color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: 0.3,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Ico name="sparkle" size={14} color="#fff" /> Nudge overdue customers
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 6, padding: '14px 20px 6px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }} className="no-scrollbar">
        {[
          { id: 'all', l: 'All' }, { id: 'draft', l: 'Draft' },
          { id: 'sent', l: 'Sent' }, { id: 'paid', l: 'Paid' },
          { id: 'overdue', l: 'Overdue' },
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              padding: '8px 14px', borderRadius: 999,
              background: active ? c.ink : c.card,
              color: active ? '#fff' : c.mutedHi,
              fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
              border: `1px solid ${active ? c.ink : c.lineSoft}`,
            }}>{t.l}</button>
          );
        })}
      </div>

      <div style={{ padding: '6px 20px 0' }}>
        {f.map(inv => (
          <button key={inv.id} onClick={() => Nav && Nav('invoices-detail')} style={{
            display: 'flex', width: '100%', alignItems: 'center', gap: 14,
            padding: 16, borderRadius: 18, marginBottom: 10,
            background: c.card, border: `1px solid ${c.lineSoft}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)', textAlign: 'left',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: inv.status === 'overdue' ? c.orangeSoft : c.paperDeep,
              color: inv.status === 'overdue' ? c.orangeDeep : c.mutedHi,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, letterSpacing: 0.5, flexShrink: 0,
            }}>
              {inv.id.split('-')[1]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.ink, letterSpacing: -0.2 }}>
                {inv.title}
              </div>
              <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
                {inv.cust} · {inv.age}
              </div>
              <div style={{ marginTop: 6 }}>
                <StatusPill tone={inv.status}>{inv.status}</StatusPill>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontSize: 16, fontWeight: 800,
                color: inv.status === 'paid' ? c.green : inv.status === 'overdue' ? c.orangeDeep : c.ink,
                letterSpacing: -0.3,
              }}>
                ${inv.amt.toLocaleString()}
              </div>
              <Arrow size={14} color={c.muted} />
            </div>
          </button>
        ))}
      </div>
    </Screen>
  );
}

// ═══ Invoice detail ════════════════════════════════════════════
function _InvoiceDetail() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const lines = [
    { n: 'Rheem 315L Stellar HWU', q: 1, p: 1420 },
    { n: 'Removal + install labour', q: 2, p: 180 },
    { n: 'Expansion valve + fittings', q: 1, p: 85 },
    { n: 'Callout fee', q: 1, p: 120 },
  ];
  const subtotal = lines.reduce((s, l) => s + l.p * l.q, 0);
  const gst = Math.round(subtotal * 0.1);
  const total = subtotal + gst;

  return (
    <Screen nav="invoices">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 0' }}>
        <button onClick={() => Nav && Nav('invoices-list')} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico name="back" size={18} /></button>
        <div style={{ flex: 1 }}>
          <Eyebrow>INV-248</Eyebrow>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.ink, letterSpacing: -0.4 }}>Hot water swap</div>
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico name="download" size={18} /></button>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        {/* Big due number */}
        <div style={{
          background: c.black, color: '#fff', borderRadius: 22, padding: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 140, height: 140,
            background: `radial-gradient(circle, ${c.orange}88, transparent 70%)`,
            opacity: 0.35, pointerEvents: 'none',
          }} />
          <Eyebrow color="rgba(255,255,255,0.6)">Amount due</Eyebrow>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, marginTop: 6 }}>
            $2,004
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Due <b style={{ color: '#fff' }}>Fri 3 May</b> · 14 days
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button style={{
              flex: 1, height: 44, borderRadius: 14,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><Ico name="eye" size={14} color="#fff" /> View PDF</button>
            <button style={{
              flex: 1, height: 44, borderRadius: 14,
              background: c.orange, color: '#fff',
              fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><Ico name="send" size={14} color="#fff" /> Send reminder</button>
          </div>
        </div>

        {/* Payment status */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Status</Eyebrow>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Dot color={c.blue} pulse />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.ink }}>Sent & viewed</div>
              <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>Opened on mobile · 12 minutes ago</div>
            </div>
          </div>
        </Card>

        {/* Line items */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Charges</Eyebrow>
        <Card pad={0}>
          {lines.map((l, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', gap: 10,
              padding: '14px 16px',
              borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
            }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: c.ink }}>{l.n}</div>
              <div style={{ fontSize: 11, color: c.muted, width: 32, textAlign: 'right' }}>×{l.q}</div>
              <div style={{ fontSize: 13, fontWeight: 800, minWidth: 60, textAlign: 'right' }}>
                ${(l.p * l.q).toLocaleString()}
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${c.lineSoft}`, padding: 16 }}>
            {[
              ['Subtotal', subtotal],
              ['GST (10%)', gst],
              ['Total', total, true],
            ].map(([l, v, bold]) => (
              <div key={l} style={{
                display: 'flex', justifyContent: 'space-between', marginBottom: 4,
                fontSize: bold ? 14 : 12,
                fontWeight: bold ? 800 : 600,
                color: bold ? c.ink : c.mutedHi,
              }}>
                <span>{l}</span><span>${v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>

        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Payment methods offered</Eyebrow>
        <Card pad={0}>
          {[
            ['Bank transfer', 'BSB 062-001 · 1234 5678'],
            ['Credit / debit card', 'Via Stripe · 1.9% + 30¢'],
            ['PayID', 'andy@vargenezey.com.au'],
          ].map(([l, v], i) => (
            <div key={l} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: c.ink }}>{l}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{v}</div>
              </div>
              <Ico name="check" size={14} color={c.green} />
            </div>
          ))}
        </Card>
      </div>

      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
      }}>
        <PrimaryBtn full icon="check">Mark paid manually</PrimaryBtn>
      </div>
    </Screen>
  );
}

// ═══ Invoice create ═════════════════════════════════════════════
function _InvoiceCreate() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <Screen nav="invoices">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 0' }}>
        <button onClick={() => Nav && Nav('invoices-list')} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico name="back" size={18} /></button>
        <div style={{ flex: 1 }}>
          <Eyebrow>New invoice</Eyebrow>
          <div style={{ fontSize: 20, fontWeight: 800, color: c.ink, letterSpacing: -0.5 }}>Turn a job into cash</div>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        {/* From job suggestion */}
        <Card style={{
          background: c.orangeSoft, border: `1px solid rgba(242,106,42,0.3)`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: c.orange,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Ico name="sparkle" size={20} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <Eyebrow color={c.orangeDeep}>Pre-filled from</Eyebrow>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.ink, marginTop: 2 }}>
              Job J-91 · Hot water swap
            </div>
            <div style={{ fontSize: 11, color: c.orangeDeep, fontWeight: 700, marginTop: 1 }}>
              4 line items · $2,004 total
            </div>
          </div>
        </Card>

        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Details</Eyebrow>
        <FormField label="Customer" value="Jack Dalton" />
        <FormField label="Reference" value="Hot water swap — 21 Apr" />
        <FormField label="Due date" value="Fri 3 May (14 days)" />

        <Eyebrow style={{ marginTop: 14, marginBottom: 8 }}>Charges</Eyebrow>
        <Card pad={0}>
          {[
            ['Rheem 315L HWU', 1, 1420],
            ['Labour', 2, 180],
            ['Valve + fittings', 1, 85],
            ['Callout', 1, 120],
          ].map(([n, q, p], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
            }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 11, color: c.muted }}>×{q}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>${(p * q).toLocaleString()}</div>
            </div>
          ))}
        </Card>

        {/* Total */}
        <div style={{
          marginTop: 14, padding: '16px 18px', borderRadius: 18,
          background: c.black, color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, opacity: 0.7, textTransform: 'uppercase' }}>
            Total · inc GST
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: c.orange }}>
            $2,004
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
        display: 'flex', gap: 8,
      }}>
        <button style={{
          flex: 1, height: 54, borderRadius: 18,
          background: c.card, border: `1px solid ${c.lineMid}`,
          fontSize: 13, fontWeight: 800, color: c.ink,
        }}>Save draft</button>
        <button onClick={() => Nav && Nav('invoices-detail')} style={{
          flex: 2, height: 54, borderRadius: 18,
          background: c.orange, color: '#fff',
          fontSize: 15, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 10px 24px ${c.orange}66`,
        }}>Send invoice <Ico name="send" size={16} color="#fff" /></button>
      </div>
    </Screen>
  );
}

function __wrap(Comp) {
  return function Wrapped() {
    const dark = localStorage.getItem('vgn_proto_dark') === '1';
    return <ThemeProvider dark={dark}><Comp /></ThemeProvider>;
  };
}
Object.assign(window, {
  InvoicesList:  __wrap(_InvoicesList),
  InvoiceDetail: __wrap(_InvoiceDetail),
  InvoiceCreate: __wrap(_InvoiceCreate),
});
