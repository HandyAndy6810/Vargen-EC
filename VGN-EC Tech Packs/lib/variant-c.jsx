// Variant C — "Workbench" — dense, info-rich dashboard
// Philosophy: tradie at end/start of day, wants to SEE everything on one screen.
// A glanceable ops board: jobs on a timeline, quote pipeline, $ tiles, AI entry as a sticky FAB.

function VariantC() {
  return (
    <div style={{ background: WF_BG, minHeight: '100%', paddingBottom: 140 }}>
      <WfHeader title="The workbench" date="Sun 19 Apr · Week 16" action="⚙" />

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Revenue goal ring + $ tiles */}
        <WfCard p={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* ring */}
            <div style={{
              width: 68, height: 68, borderRadius: '50%',
              background: `conic-gradient(${WF_ORANGE} 0 62%, ${WF_FILL} 62% 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: '#fff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: WF_INK, lineHeight: 1 }}>62%</div>
                <div style={{ fontSize: 8, color: WF_MUTED, letterSpacing: 0.5 }}>GOAL</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <WfLabel>Week 16 revenue</WfLabel>
              <div style={{ fontSize: 18, fontWeight: 800, color: WF_INK, marginTop: 2 }}>
                $3,120 <span style={{ fontSize: 10, color: WF_MUTED, fontWeight: 600 }}>/ $5,000</span>
              </div>
              <div style={{ fontSize: 10.5, color: WF_MUTED, marginTop: 2 }}>$1,880 to go · 3 jobs booked</div>
            </div>
          </div>
        </WfCard>

        {/* Today timeline */}
        <WfCard p={12}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <WfLabel>Today · 3 jobs</WfLabel>
            <span style={{ fontSize: 10, color: WF_ORANGE, fontWeight: 800 }}>Open calendar ›</span>
          </div>
          {/* timeline */}
          <div style={{ position: 'relative', paddingLeft: 38 }}>
            {/* vertical line */}
            <div style={{
              position: 'absolute', left: 28, top: 4, bottom: 4,
              width: 1.5, background: WF_LINE,
            }} />
            {[
              { t: '9:30', title: 'Hot water swap', sub: 'Dalton · Rozelle', status: 'next', tone: WF_ORANGE },
              { t: '12:30', title: 'Leaking tap', sub: 'J Chen · Glebe', status: '', tone: WF_INK },
              { t: '3:00', title: 'Bathroom reno quote', sub: 'K Ng · Newtown', status: 'quote', tone: WF_LINE_STRONG },
            ].map((j, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: -26, top: 10,
                  width: 12, height: 12, borderRadius: '50%',
                  background: j.tone, border: '2px solid #fff',
                  boxShadow: `0 0 0 1.5px ${j.tone}`,
                }} />
                <div style={{ width: 40, fontSize: 11, fontWeight: 800, color: WF_INK, marginLeft: -24 }}>{j.t}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WF_INK }}>{j.title}</div>
                  <div style={{ fontSize: 10, color: WF_MUTED }}>{j.sub}</div>
                </div>
                {j.status === 'next' && <WfChip tone="orange">Next</WfChip>}
                {j.status === 'quote' && <WfChip>Quote</WfChip>}
              </div>
            ))}
          </div>
        </WfCard>

        {/* Pipeline grid */}
        <div>
          <WfLabel style={{ margin: '4px 4px 6px' }}>Pipeline</WfLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[
              { n: 4, l: 'Draft', c: WF_MUTED },
              { n: 7, l: 'Sent', c: '#1f6feb' },
              { n: 3, l: 'Accepted', c: '#2a9d4c' },
              { n: 2, l: 'Overdue', c: WF_ORANGE },
            ].map(s => (
              <WfCard key={s.l} p={8} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 8.5, fontWeight: 800, color: WF_MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 }}>{s.l}</div>
              </WfCard>
            ))}
          </div>
        </div>

        {/* $ dollar row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <WfCard p={10} style={{ flex: 1 }}>
            <WfLabel>Quotes out</WfLabel>
            <div style={{ fontSize: 15, fontWeight: 800, color: WF_ORANGE, marginTop: 3 }}>$4,240</div>
          </WfCard>
          <WfCard p={10} style={{ flex: 1 }}>
            <WfLabel>Unpaid</WfLabel>
            <div style={{ fontSize: 15, fontWeight: 800, color: WF_INK, marginTop: 3 }}>$1,820</div>
          </WfCard>
          <WfCard p={10} style={{ flex: 1 }}>
            <WfLabel>Paid (mo)</WfLabel>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#2a9d4c', marginTop: 3 }}>$11.4k</div>
          </WfCard>
        </div>

        {/* Weather strip */}
        <WfCard p={10}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <WfLabel>Weather · Sydney</WfLabel>
            <span style={{ fontSize: 9.5, color: WF_ORANGE, fontWeight: 800 }}>⚠ Rain Tue</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['Mon','Tue','Wed','Thu'].map((d, i) => (
              <div key={d} style={{
                flex: 1, textAlign: 'center', padding: '6px 0', borderRadius: 10,
                background: i === 1 ? WF_ORANGE_SOFT : WF_BG,
                border: solid(i === 1 ? WF_ORANGE : WF_LINE),
              }}>
                <div style={{ fontSize: 9, color: WF_MUTED, fontWeight: 800 }}>{d}</div>
                <div style={{ fontSize: 13, marginTop: 2 }}>{['☀','🌧','⛅','☀'][i]}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: WF_INK }}>{['24°','18°','21°','26°'][i]}</div>
              </div>
            ))}
          </div>
        </WfCard>

      </div>

      {/* AI FAB — floating */}
      <div style={{
        position: 'absolute', right: 20, bottom: 110, zIndex: 20,
        width: 58, height: 58, borderRadius: '50%', background: WF_ORANGE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 22, fontWeight: 800,
        boxShadow: `0 10px 24px rgba(242,106,42,0.4)`,
      }}>✦</div>

      <WfBottomNav active={0} />
    </div>
  );
}

window.VariantC = VariantC;
