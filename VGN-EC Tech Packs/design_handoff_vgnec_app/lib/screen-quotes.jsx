// Quotes — list, detail, create.

function QToolbar({ title, onBack, actions }) {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '56px 20px 0',
    }}>
      {onBack ? (
        <button onClick={() => Nav && Nav(onBack)} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="back" size={18} />
        </button>
      ) : null}
      <div style={{ flex: 1 }}>
        <Eyebrow>Quotes</Eyebrow>
        <div style={{ fontSize: 22, fontWeight: 800, color: c.ink, letterSpacing: -0.5, marginTop: 2 }}>
          {title}
        </div>
      </div>
      {actions}
    </div>
  );
}

// ═══ Quotes list ════════════════════════════════════════════════
function _QuotesList() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const [filter, setFilter] = React.useState('all');
  const quotes = [
    { id: 'Q-2048', title: 'Hot water swap', cust: 'Jack Dalton', amt: 2004, status: 'draft',   age: 'Just now' },
    { id: 'Q-2047', title: 'Bathroom reno',  cust: 'K Ng',        amt: 8420, status: 'sent',    age: '2d ago' },
    { id: 'Q-2046', title: 'Outdoor lighting install', cust: 'M Webb', amt: 1260, status: 'viewed', age: '3d ago' },
    { id: 'Q-2045', title: 'Leaking tap fix', cust: 'J Chen',     amt: 320,  status: 'accepted', age: '5d ago' },
    { id: 'Q-2044', title: 'Switchboard upgrade', cust: 'Pearson',amt: 3880, status: 'overdue',  age: '11d ago' },
    { id: 'Q-2043', title: 'Downlights x 8',  cust: 'Tanaka',     amt: 1450, status: 'accepted', age: '12d ago' },
  ];
  const filtered = filter === 'all' ? quotes : quotes.filter(q => q.status === filter);
  const tabs = [
    { id: 'all',      l: 'All',      n: quotes.length },
    { id: 'draft',    l: 'Draft',    n: quotes.filter(q => q.status === 'draft').length },
    { id: 'sent',     l: 'Sent',     n: quotes.filter(q => q.status === 'sent' || q.status === 'viewed').length },
    { id: 'accepted', l: 'Accepted', n: quotes.filter(q => q.status === 'accepted').length },
    { id: 'overdue',  l: 'Overdue',  n: quotes.filter(q => q.status === 'overdue').length },
  ];

  return (
    <Screen nav="quotes">
      <QToolbar title="All quotes" actions={
        <button onClick={() => Nav && Nav('quotes-create')} style={{
          width: 40, height: 40, borderRadius: 12, background: c.orange,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 14px ${c.orange}55`,
        }}>
          <Ico name="plus" size={20} color="#fff" />
        </button>
      } />

      {/* Summary strip */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          background: c.black, color: '#fff', borderRadius: 22, padding: 18,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 140, height: 140,
            background: `radial-gradient(circle, ${c.orange}88, transparent 70%)`,
            opacity: 0.35, pointerEvents: 'none',
          }} />
          <Eyebrow color="rgba(255,255,255,0.6)">Outstanding pipeline</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1 }}>
              $14,230
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
              / 9 quotes
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, fontWeight: 700 }}>
            <span><span style={{ color: c.orange }}>●</span> $3,880 overdue</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>●  $8,420 awaiting</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>●  $1,930 today</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 14,
          background: c.card, border: `1px solid ${c.lineSoft}`,
        }}>
          <Ico name="search" size={16} color={c.muted} />
          <div style={{ flex: 1, fontSize: 13, color: c.muted }}>Search quotes, customers…</div>
          <Ico name="filter" size={16} color={c.muted} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '14px 20px 6px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }} className="no-scrollbar">
        {tabs.map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              padding: '8px 14px', borderRadius: 999,
              background: active ? c.ink : c.card,
              color: active ? '#fff' : c.mutedHi,
              fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
              border: `1px solid ${active ? c.ink : c.lineSoft}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.l}
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 999,
                background: active ? c.orange : c.paperDeep,
                color: active ? '#fff' : c.muted,
              }}>{t.n}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ padding: '6px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(q => (
          <button key={q.id} onClick={() => Nav && Nav('quotes-detail')} style={{
            textAlign: 'left', padding: 16, borderRadius: 18,
            background: c.card, border: `1px solid ${c.lineSoft}`,
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: c.paperDeep, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 800, color: c.mutedHi, letterSpacing: 0.5, flexShrink: 0,
            }}>
              {q.id.split('-')[1]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c.ink, letterSpacing: -0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {q.title}
                </div>
              </div>
              <div style={{ fontSize: 11, color: c.muted }}>
                {q.cust} · {q.age}
              </div>
              <div style={{ marginTop: 6 }}>
                <StatusPill tone={q.status}>{q.status}</StatusPill>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: c.ink, letterSpacing: -0.3 }}>
                ${q.amt.toLocaleString()}
              </div>
              <Arrow size={14} color={c.muted} />
            </div>
          </button>
        ))}
      </div>
    </Screen>
  );
}

// ═══ Quote detail ═══════════════════════════════════════════════
function _QuoteDetail() {
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
    <Screen nav="quotes">
      <QToolbar title="Q-2048" onBack="quotes-list" actions={
        <button style={{
          width: 40, height: 40, borderRadius: 12, background: c.card,
          border: `1px solid ${c.lineSoft}`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="more" size={18} />
        </button>
      } />

      <div style={{ padding: '18px 20px 0' }}>
        {/* Status hero */}
        <div style={{
          background: c.card, borderRadius: 22, padding: 18,
          border: `1px solid ${c.lineSoft}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.ink, letterSpacing: -0.4 }}>
                Hot water swap
              </div>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                For Jack Dalton · Issued Sun 19 Apr
              </div>
            </div>
            <StatusPill tone="sent">Sent</StatusPill>
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: c.orange, letterSpacing: -1.1, lineHeight: 1 }}>
              $2,004
            </div>
            <div style={{ fontSize: 12, color: c.muted, fontWeight: 700 }}>inc GST</div>
          </div>

          {/* Progress rail */}
          <div style={{ marginTop: 16, display: 'flex', gap: 4 }}>
            {['Drafted', 'Sent', 'Viewed', 'Accepted'].map((s, i) => {
              const done = i < 2;
              const cur = i === 2;
              return (
                <div key={s} style={{ flex: 1 }}>
                  <div style={{
                    height: 4, borderRadius: 999,
                    background: done ? c.orange : cur ? c.orangeSoft : c.paperDeep,
                  }} />
                  <div style={{
                    fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
                    color: done ? c.orangeDeep : cur ? c.orange : c.muted,
                    marginTop: 6,
                  }}>{s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Customer</Eyebrow>
        <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: c.ink,
            color: c.orange, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800,
          }}>JD</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.ink }}>Jack Dalton</div>
            <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>42 Harbour St, Rozelle · 5 previous jobs</div>
          </div>
          <button style={{
            width: 36, height: 36, borderRadius: 10, background: c.paperDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Ico name="phone" size={16} /></button>
          <button style={{
            width: 36, height: 36, borderRadius: 10, background: c.paperDeep,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Ico name="msg" size={16} /></button>
        </Card>

        {/* Line items */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Line items · {lines.length}</Eyebrow>
        <Card pad={0}>
          {lines.map((l, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
              padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
            }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: c.ink }}>{l.n}</div>
              <div style={{ fontSize: 11, color: c.muted, width: 32, textAlign: 'right' }}>×{l.q}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.ink, minWidth: 60, textAlign: 'right' }}>
                ${(l.p * l.q).toLocaleString()}
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${c.lineSoft}`, padding: 16 }}>
            {[
              ['Subtotal', subtotal],
              ['GST (10%)', gst],
              ['Total', total, true],
            ].map(([l, v, bold], i) => (
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

        {/* Activity log */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>History</Eyebrow>
        <Card pad={0}>
          {[
            { t: 'Viewed on mobile', ago: '12m', icon: 'eye', color: c.blue },
            { t: 'SMS delivered',    ago: '18m', icon: 'check', color: c.green },
            { t: 'AI drafted quote', ago: '1h',  icon: 'sparkle', color: c.orange },
          ].map((h, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 10,
                background: h.color + '22', color: h.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ico name={h.icon} size={14} color={h.color} />
              </div>
              <div style={{ flex: 1, fontSize: 13, color: c.ink, fontWeight: 600 }}>{h.t}</div>
              <div style={{ fontSize: 11, color: c.muted, fontWeight: 700 }}>{h.ago}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
        display: 'flex', gap: 8,
      }}>
        <button style={{
          flex: 1, height: 54, borderRadius: 18,
          background: c.card, border: `1px solid ${c.lineMid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          fontSize: 13, fontWeight: 800, color: c.ink,
          boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
        }}><Ico name="edit" size={15} /> Tweak</button>
        <button onClick={() => Nav && Nav('invoices-create')} style={{
          flex: 2, height: 54, borderRadius: 18,
          background: c.orange, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
          boxShadow: `0 10px 24px ${c.orange}66`,
        }}>Convert to invoice <Arrow size={16} color="#fff" /></button>
      </div>
    </Screen>
  );
}

// ═══ Quote create (form + chat toggle) ══════════════════════════
function _QuoteCreate() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const [mode, setMode] = React.useState('ai'); // ai | form
  return (
    <Screen nav="quotes">
      <QToolbar title="New quote" onBack="quotes-list" />

      {/* Mode toggle — AI vs Form */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'flex', background: c.paperDeep, borderRadius: 14, padding: 4,
        }}>
          {[
            { id: 'ai',   l: 'Use AI',  icon: 'sparkle' },
            { id: 'form', l: 'Form',    icon: 'grid' },
          ].map(t => {
            const active = mode === t.id;
            return (
              <button key={t.id} onClick={() => setMode(t.id)} style={{
                flex: 1, height: 40, borderRadius: 10,
                background: active ? c.card : 'transparent',
                boxShadow: active ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                fontSize: 13, fontWeight: 800,
                color: active ? c.ink : c.muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Ico name={t.icon} size={14} color={active ? c.ink : c.muted} /> {t.l}
              </button>
            );
          })}
        </div>
      </div>

      {mode === 'ai' ? (
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            textAlign: 'center', padding: '32px 12px 24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <AiAvatar size={56} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8, color: c.ink, lineHeight: 1.1 }}>
              Describe the job<br/>
              <span style={{ color: c.orange }}>in one sentence.</span>
            </div>
          </div>
          <button onClick={() => Nav && Nav('ai-entry')} style={{
            width: '100%', height: 56, borderRadius: 20,
            background: c.orange, color: '#fff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 15, fontWeight: 800, boxShadow: `0 10px 28px ${c.orange}55`,
          }}>
            <Ico name="sparkle" size={18} color="#fff" /> Start with AI
          </button>
          <button onClick={() => setMode('form')} style={{
            width: '100%', marginTop: 10,
            fontSize: 13, color: c.muted, fontWeight: 700,
          }}>Or fill out a form manually</button>
        </div>
      ) : (
        <div style={{ padding: '16px 20px 0' }}>
          {/* Customer field */}
          <FormField label="Customer" placeholder="Search or add" value="Jack Dalton" />
          <FormField label="Job title" placeholder="Hot water swap" value="" />
          <FormField label="Scheduled date" placeholder="DD/MM/YYYY" value="Tue 21 Apr · 9:30 am" />
          <FormField label="Notes" placeholder="Anything the customer should see…" value="" multi />

          <Eyebrow style={{ marginTop: 14, marginBottom: 8 }}>Line items</Eyebrow>
          <Card pad={0}>
            {[
              ['Rheem 315L HWU', 1, 1420],
              ['Labour (2hrs @ $90)', 2, 180],
            ].map(([n, q, p], i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
              }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{n}</div>
                <div style={{ fontSize: 11, color: c.muted }}>×{q}</div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>${p * q}</div>
              </div>
            ))}
            <button style={{
              width: '100%', padding: 14,
              borderTop: `1px dashed ${c.lineMid}`,
              color: c.orangeDeep, fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Ico name="plus" size={14} color={c.orangeDeep} /> Add line item
            </button>
          </Card>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
      }}>
        <PrimaryBtn full onClick={() => Nav && Nav('ai-draft')}>Save draft</PrimaryBtn>
      </div>
    </Screen>
  );
}

// Reusable form field
function FormField({ label, placeholder, value, multi }) {
  const { c } = useTheme();
  return (
    <div style={{ marginBottom: 10 }}>
      <Eyebrow style={{ marginBottom: 6 }}>{label}</Eyebrow>
      <div style={{
        background: c.card, border: `1px solid ${c.lineSoft}`,
        borderRadius: 14, padding: multi ? '12px 14px' : '14px',
        minHeight: multi ? 72 : 44,
        display: 'flex', alignItems: multi ? 'flex-start' : 'center',
        fontSize: 14, fontWeight: value ? 700 : 500,
        color: value ? c.ink : c.muted,
      }}>
        {value || placeholder}
      </div>
    </div>
  );
}

function __wrap(Comp) {
  return function Wrapped() {
    const dark = localStorage.getItem('vgn_proto_dark') === '1';
    return <ThemeProvider dark={dark}><Comp /></ThemeProvider>;
  };
}

Object.assign(window, {
  QuotesList:  __wrap(_QuotesList),
  QuoteDetail: __wrap(_QuoteDetail),
  QuoteCreate: __wrap(_QuoteCreate),
  FormField,
});
