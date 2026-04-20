// Bold hi-fi Home — "Mission Control" direction.
// Big type, orange as a hero color (not accent), layered cards with overhangs,
// numerical drama, a bit of copy personality. Still Manrope, still #f26a2a.

const C = {
  ink: '#141310',
  paper: '#f7f4ee',       // warm off-white
  paperDeep: '#efe9dd',
  orange: '#f26a2a',
  orangeDeep: '#d94d0e',
  orangeSoft: '#ffe6d3',
  cream: '#fff8ef',
  lineSoft: 'rgba(20,19,16,0.08)',
  lineMid: 'rgba(20,19,16,0.14)',
  muted: 'rgba(20,19,16,0.55)',
  mutedHi: 'rgba(20,19,16,0.72)',
  black: '#0f0e0b',
  greenDot: '#2a9d4c',
  blueDot: '#1f6feb',
  yellowDot: '#f5b800',
};

// ─── small atoms ─────────────────────────────────────────────
function Dot({ c = C.orange, size = 8, pulse = false }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', background: c, flexShrink: 0,
      boxShadow: pulse ? `0 0 0 4px ${c}22, 0 0 0 8px ${c}11` : 'none',
    }} />
  );
}

function EyebrowLabel({ children, c = C.muted, style = {} }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 800, letterSpacing: 2, color: c,
      textTransform: 'uppercase', ...style,
    }}>{children}</div>
  );
}

// Arrow icon
function Arrow({ size = 14, c = C.ink, rot = -45 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ transform: `rotate(${rot}deg)`, flexShrink: 0 }}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── 1. Top bar with avatar + weather pill ───────────────────
function TopBar() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '56px 20px 0',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: C.ink, color: C.orange,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, letterSpacing: -0.2,
      }}>AH</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px 6px 6px', borderRadius: 999,
        background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
        border: `1px solid ${C.lineSoft}`,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', background: '#d9ecff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>☀</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>24°</div>
        <div style={{ fontSize: 11, color: C.muted }}>· Sydney</div>
      </div>
    </div>
  );
}

// ─── 2. HERO — oversized greeting + mission control card ──────
function Hero() {
  return (
    <div style={{ padding: '22px 20px 0', position: 'relative' }}>
      {/* Headline — bold editorial */}
      <div style={{ marginBottom: 18 }}>
        <EyebrowLabel>Sun 19 Apr · 07:42</EyebrowLabel>
        <div style={{
          fontSize: 42, fontWeight: 800, color: C.ink, lineHeight: 0.98,
          letterSpacing: -1.5, marginTop: 6,
        }}>
          G'day,<br/>
          <span style={{ color: C.orange }}>Andy.</span>
        </div>
        <div style={{ fontSize: 14, color: C.mutedHi, marginTop: 10, lineHeight: 1.4, maxWidth: 280 }}>
          3 jobs booked today. $1,880 til you hit weekly goal.
          <span style={{ color: C.muted }}> Let's not touch a single form.</span>
        </div>
      </div>

      {/* HERO CARD — next job, black, big, with orange ribbon */}
      <div style={{
        background: C.black, borderRadius: 28, padding: 20,
        color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 18px 40px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Orange corner ribbon */}
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 140, height: 140,
          background: `radial-gradient(circle at top right, ${C.orange}, transparent 70%)`,
          opacity: 0.45, pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot c={C.orange} pulse />
            <EyebrowLabel c="rgba(255,255,255,0.6)">Up next · 9:30 am</EyebrowLabel>
          </div>
          <div style={{
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.12)', fontSize: 10.5, fontWeight: 800,
            letterSpacing: 0.8,
          }}>1H 45M</div>
        </div>

        <div style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.6,
          marginBottom: 6,
        }}>
          Hot water unit<br/>swap — Dalton.
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>
          42 Harbour St, Rozelle · 12 min drive
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, height: 52, borderRadius: 16, background: C.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
            boxShadow: '0 6px 20px rgba(242,106,42,0.45)',
          }}>
            <span style={{ fontSize: 13 }}>▶</span> Start job
          </div>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>📍</div>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>💬</div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. AI prompt rail — orange, prominent, tappable ─────────
function AiRail() {
  return (
    <div style={{ padding: '14px 20px 0' }}>
      <div style={{
        background: C.orange, borderRadius: 24, padding: 18,
        color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 14px 28px rgba(242,106,42,0.3)',
      }}>
        {/* Faint sparkle texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 40%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16,
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>✦</div>
          <div style={{ flex: 1 }}>
            <EyebrowLabel c="rgba(255,255,255,0.75)">Quote with a sentence</EyebrowLabel>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2, marginTop: 4, lineHeight: 1.2 }}>
              "Swap hot water at Dalton's, $1,840..."
            </div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: '#fff', color: C.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>🎤</div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Weekly goal — big number + orange progress arc ───────
function GoalBlock() {
  const pct = 62;
  // stroke-dasharray on a semi-circle arc
  const r = 72;
  const circ = Math.PI * r; // semi circumference
  const dash = (pct / 100) * circ;
  return (
    <div style={{ padding: '14px 20px 0' }}>
      <div style={{
        background: C.cream, borderRadius: 24, padding: '22px 20px 18px',
        position: 'relative', overflow: 'hidden',
        border: `1px solid ${C.lineSoft}`,
      }}>
        <EyebrowLabel>Week 16 revenue</EyebrowLabel>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: C.ink, letterSpacing: -1.5, lineHeight: 0.95 }}>
            $3,120
          </div>
          <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, marginBottom: 6 }}>
            / $5,000 goal
          </div>
        </div>

        {/* Progress bar with milestone ticks */}
        <div style={{ position: 'relative', height: 10, borderRadius: 999, background: C.paperDeep, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${C.orange}, ${C.orangeDeep})`,
            borderRadius: 999,
          }} />
          {[25, 50, 75].map(m => (
            <div key={m} style={{
              position: 'absolute', top: 2, bottom: 2, left: `${m}%`,
              width: 1.5, background: 'rgba(255,255,255,0.6)',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.mutedHi, fontWeight: 600 }}>
          <span><b style={{ color: C.orange }}>62%</b> there · $1,880 to go</span>
          <span>3 jobs booked</span>
        </div>
      </div>
    </div>
  );
}

// ─── 5. Pipeline — horizontal chips, bold numbers ────────────
function Pipeline() {
  const stages = [
    { n: 4, l: 'Draft',     c: C.muted,     bg: '#fff', ring: C.lineMid },
    { n: 7, l: 'Sent',      c: C.blueDot,   bg: '#eaf2ff', ring: '#c8dcff' },
    { n: 3, l: 'Accepted',  c: C.greenDot,  bg: '#e5f6eb', ring: '#bde2c9' },
    { n: 2, l: 'Overdue',   c: C.orange,    bg: C.orangeSoft, ring: '#f8c59f' },
  ];
  return (
    <div style={{ padding: '14px 0 0' }}>
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <EyebrowLabel>Quote pipeline</EyebrowLabel>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 2, letterSpacing: -0.3 }}>
            16 on the go · <span style={{ color: C.orange }}>$4,240 out</span>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.orange }}>See all →</div>
      </div>
      <div style={{
        display: 'flex', gap: 10, padding: '0 20px 4px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {stages.map(s => (
          <div key={s.l} style={{
            background: s.bg, border: `1.5px solid ${s.ring}`,
            borderRadius: 20, padding: '14px 16px', minWidth: 108,
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.c, letterSpacing: -0.8, lineHeight: 1 }}>
              {s.n}
            </div>
            <EyebrowLabel c={s.c}>{s.l}</EyebrowLabel>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 6. Today's schedule — vertical timeline ────────────────
function TodaySchedule() {
  const jobs = [
    { t: '9:30 am', dur: '90m', title: 'Hot water swap', sub: 'Dalton · Rozelle', tone: 'next' },
    { t: '12:30 pm', dur: '30m', title: 'Leaking tap fix', sub: 'J Chen · Glebe', tone: 'normal' },
    { t: '3:00 pm', dur: '45m', title: 'Bathroom reno — quote visit', sub: 'K Ng · Newtown', tone: 'quote' },
  ];
  return (
    <div style={{ padding: '18px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <EyebrowLabel>Today · 3 stops</EyebrowLabel>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 2, letterSpacing: -0.3 }}>
            Out the door by 9.
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.orange }}>Calendar →</div>
      </div>

      <div>
        {jobs.map((j, i) => {
          const dotC = j.tone === 'next' ? C.orange : j.tone === 'quote' ? C.blueDot : C.ink;
          const isLast = i === jobs.length - 1;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
              {/* left gutter: time + rail + dot */}
              <div style={{
                width: 54, flexShrink: 0, position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                paddingTop: 6, paddingRight: 14,
              }}>
                <div style={{ color: C.ink, fontSize: 12, fontWeight: 800, letterSpacing: 0.2, lineHeight: 1 }}>
                  {j.t.split(' ')[0]}
                </div>
                <div style={{ color: C.muted, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, marginTop: 2, textTransform: 'uppercase' }}>
                  {j.t.split(' ')[1]}
                </div>
                {/* vertical rail */}
                <div style={{
                  position: 'absolute', right: 5, top: 22,
                  bottom: isLast ? 'auto' : -14,
                  height: isLast ? 20 : 'auto',
                  width: 2, background: dotC, opacity: 0.3,
                }} />
                {/* dot */}
                <div style={{
                  position: 'absolute', right: -1, top: 6,
                  width: 12, height: 12, borderRadius: '50%',
                  background: dotC, border: '3px solid ' + C.paper,
                  boxShadow: `0 0 0 1.5px ${dotC}`,
                }} />
              </div>
              {/* card */}
              <div style={{
                flex: 1, minWidth: 0,
                background: '#fff', border: `1px solid ${C.lineSoft}`,
                borderRadius: 18, padding: '12px 14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                marginBottom: isLast ? 0 : 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, letterSpacing: -0.2 }}>{j.title}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: 0.3, flexShrink: 0 }}>{j.dur}</div>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{j.sub}</div>
                {j.tone === 'quote' && (
                  <div style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 999, background: C.orangeSoft,
                    fontSize: 9.5, fontWeight: 800, color: C.orangeDeep, letterSpacing: 0.6,
                    textTransform: 'uppercase',
                  }}>✦ AI pre-draft ready</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 7. Activity ticker ──────────────────────────────────────
function ActivityTicker() {
  const items = [
    { ic: '✓', c: C.greenDot, bg: '#e5f6eb', text: <><b>Dalton</b> accepted your quote</>, amt: '+$1,840', t: '12m' },
    { ic: '◐', c: C.blueDot, bg: '#eaf2ff', text: <><b>J Chen</b> opened your invoice</>, amt: 'INV #248', t: '1h' },
    { ic: '!', c: C.orange, bg: C.orangeSoft, text: <>INV #241 now <b>overdue</b></>, amt: '$620', t: '2d' },
  ];
  return (
    <div style={{ padding: '22px 20px 0' }}>
      <EyebrowLabel style={{ marginBottom: 12 }}>Activity · Last 24h</EyebrowLabel>
      <div style={{
        background: '#fff', border: `1px solid ${C.lineSoft}`,
        borderRadius: 22, overflow: 'hidden',
      }}>
        {items.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 14px', borderTop: i === 0 ? 'none' : `1px solid ${C.lineSoft}`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: a.bg, color: a.c,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800,
            }}>{a.ic}</div>
            <div style={{ flex: 1, fontSize: 13, color: C.ink, fontWeight: 500 }}>{a.text}</div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: a.c }}>{a.amt}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{a.t} ago</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 8. Signature footer copy ────────────────────────────────
function Sig() {
  return (
    <div style={{
      padding: '26px 20px 0', textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: 0.2 }}>
        Admin for people who'd rather be on the tools.
      </div>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 800, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
        VARGENEZEY · v1.0
      </div>
    </div>
  );
}

// ─── 9. Liquid-glass bottom nav (matching app spec) ──────────
function BottomNav() {
  const items = [
    { label: 'Home', active: true, ic: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V11z" stroke={c} strokeWidth="2.2" strokeLinejoin="round"/></svg>
    )},
    { label: 'Quotes', ic: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke={c} strokeWidth="2.2"/><path d="M9 8h6M9 12h6M9 16h4" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>
    )},
    { label: 'Invoices', ic: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" stroke={c} strokeWidth="2.2" strokeLinejoin="round"/><path d="M9 9h6M9 13h4" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>
    )},
    { label: 'Calendar', ic: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke={c} strokeWidth="2.2"/><path d="M3 10h18M8 3v4M16 3v4" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>
    )},
    { label: 'Profile', ic: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke={c} strokeWidth="2.2"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7" stroke={c} strokeWidth="2.2" strokeLinecap="round"/></svg>
    )},
  ];
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 22, zIndex: 40,
      transform: 'translateX(-50%)',
      width: 'calc(100% - 44px)', maxWidth: 340,
      borderRadius: 30, padding: 5, display: 'flex',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.38) 100%)',
      backdropFilter: 'blur(28px) saturate(220%)',
      WebkitBackdropFilter: 'blur(28px) saturate(220%)',
      border: '1px solid rgba(255,255,255,0.7)',
      boxShadow:
        '0 18px 40px rgba(20,19,16,0.18),' +
        ' 0 4px 12px rgba(20,19,16,0.08),' +
        ' inset 0 1.5px 0 rgba(255,255,255,0.9),' +
        ' inset 0 -1px 0 rgba(20,19,16,0.06),' +
        ' inset 1px 0 0 rgba(255,255,255,0.5),' +
        ' inset -1px 0 0 rgba(255,255,255,0.5)',
    }}>
      {/* specular highlight streak */}
      <div style={{
        position: 'absolute', top: 1, left: 10, right: 10, height: 12,
        borderRadius: 30,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0) 100%)',
        pointerEvents: 'none',
      }} />
      {items.map((it) => {
        const c = it.active ? C.orange : 'rgba(20,19,16,0.5)';
        return (
          <div key={it.label} style={{
            flex: 1, padding: '8px 4px 7px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 2,
            borderRadius: 24, position: 'relative',
            background: it.active
              ? 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))'
              : 'transparent',
            boxShadow: it.active
              ? '0 2px 8px rgba(20,19,16,0.08), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(20,19,16,0.04)'
              : 'none',
            border: it.active ? '0.5px solid rgba(255,255,255,0.9)' : 'none',
          }}>
            {it.ic(c)}
            <div style={{
              fontSize: 9, fontWeight: 800, color: c, letterSpacing: 0.3,
              opacity: it.active ? 1 : 0,
              height: 10,
            }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Full page ───────────────────────────────────────────────
function MissionControl() {
  return (
    <div style={{
      background: C.paper, minHeight: '100%', paddingBottom: 120,
      fontFamily: 'Manrope, -apple-system, system-ui, sans-serif',
      color: C.ink, position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient blobs for visual interest */}
      <div style={{
        position: 'absolute', top: -80, right: -100, width: 340, height: 340,
        background: `radial-gradient(circle, ${C.orange}22, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 340, left: -120, width: 280, height: 280,
        background: `radial-gradient(circle, ${C.orange}14, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <TopBar />
      <Hero />
      <AiRail />
      <GoalBlock />
      <Pipeline />
      <TodaySchedule />
      <ActivityTicker />
      <Sig />

      <BottomNav />
    </div>
  );
}

Object.assign(window, { MissionControl, VGNColors: C });
