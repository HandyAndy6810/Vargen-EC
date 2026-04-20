// Variant A — "Today-first" — single-focus dashboard
// Big hero = what matters RIGHT NOW. Next job + one CTA.
// Philosophy: tradie on-site, glances at phone, sees ONE thing to do.

function VariantA() {
  return (
    <div style={{ background: WF_BG, minHeight: '100%', paddingBottom: 140 }}>
      <WfHeader title="G'day, Andy" date="Sun 19 Apr · Sydney" />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* HERO — next job */}
        <WfCard tone="dark" p={18} style={{ borderRadius: 26 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <WfLabel style={{ color: 'rgba(255,255,255,0.5)' }}>▶ Next · 9:30 am</WfLabel>
            <WfChip tone="orange">1h 45m</WfChip>
          </div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.15, marginBottom: 4 }}>
            Hot water unit swap
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 14 }}>
            Mrs Dalton · 42 Harbour St, Rozelle
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, height: 44, borderRadius: 14, background: WF_ORANGE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 800,
            }}>▶ Start job</div>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              border: '1.5px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 16,
            }}>→</div>
          </div>
        </WfCard>

        {/* AI quote prompt — always-there prompt bar */}
        <WfCard p={12} style={{ borderRadius: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WfCircle size={36} tone="orange" label="✦" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: WF_INK }}>Quote the next one</div>
              <div style={{ fontSize: 10.5, color: WF_MUTED }}>Describe it — we'll write it up</div>
            </div>
            <div style={{ fontSize: 18, color: WF_MUTED }}>›</div>
          </div>
        </WfCard>

        {/* Compact stats row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <WfCard p={10} style={{ flex: 1 }}>
            <WfLabel>Out</WfLabel>
            <div style={{ fontSize: 16, fontWeight: 800, color: WF_ORANGE, marginTop: 4 }}>$4.2k</div>
            <div style={{ fontSize: 9.5, color: WF_MUTED }}>3 quotes</div>
          </WfCard>
          <WfCard p={10} style={{ flex: 1 }}>
            <WfLabel>Week</WfLabel>
            <div style={{ fontSize: 16, fontWeight: 800, color: WF_INK, marginTop: 4 }}>8</div>
            <div style={{ fontSize: 9.5, color: WF_MUTED }}>jobs</div>
          </WfCard>
          <WfCard p={10} style={{ flex: 1, background: '#fff8e1', borderColor: '#e5c77a' }}>
            <WfLabel>Unpaid</WfLabel>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#a67400', marginTop: 4 }}>$1.8k</div>
            <div style={{ fontSize: 9.5, color: '#a67400' }}>2 overdue</div>
          </WfCard>
        </div>

        {/* Also today — minimal list */}
        <div style={{ marginTop: 6 }}>
          <WfLabel style={{ margin: '6px 4px 8px' }}>Also today · 2 more</WfLabel>
          <WfCard p={0} style={{ padding: 0, overflow: 'hidden' }}>
            {[
              { t: '12:30 pm', title: 'Leaking tap · J Chen' },
              { t: '3:00 pm', title: 'Bathroom reno quote · K Ng' },
            ].map((j, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                borderBottom: i === 0 ? solid(WF_LINE) : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: WF_ORANGE }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: WF_INK }}>{j.title}</div>
                  <div style={{ fontSize: 10, color: WF_MUTED }}>{j.t}</div>
                </div>
                <div style={{ fontSize: 14, color: WF_MUTED }}>›</div>
              </div>
            ))}
          </WfCard>
        </div>

      </div>

      <WfBottomNav active={0} />
    </div>
  );
}

window.VariantA = VariantA;
