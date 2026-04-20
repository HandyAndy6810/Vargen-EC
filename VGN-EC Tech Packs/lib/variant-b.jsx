// Variant B — "AI-chat-first" — the prompt is the product
// The Home screen IS the AI chat. Everything else sits below as a feed.
// Philosophy: tradie comes back from a job, taps the mic, says
// "quote Dalton $400 for a hot water swap" — done. Chat UI is primary.

function VariantB() {
  return (
    <div style={{ background: WF_BG, minHeight: '100%', paddingBottom: 140 }}>

      {/* Minimal top — just greeting */}
      <div style={{ padding: '56px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: WF_INK }}>Hey Andy 👋</div>
        <div style={{ fontSize: 11, color: WF_MUTED, fontWeight: 600 }}>Sun 19 Apr</div>
      </div>

      {/* HERO — AI prompt canvas. Takes up the fold. */}
      <div style={{ padding: '6px 20px 14px' }}>
        <WfCard p={18} style={{ borderRadius: 26, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <WfCircle size={28} tone="orange" label="✦" />
            <WfLabel>Admin for people who hate admin</WfLabel>
          </div>

          <div style={{
            fontSize: 22, fontWeight: 800, color: WF_INK,
            lineHeight: 1.2, marginBottom: 8, letterSpacing: -0.3,
          }}>
            What do you<br/>need quoted?
          </div>
          <div style={{ fontSize: 12, color: WF_MUTED, marginBottom: 16 }}>
            Describe the job — I'll write it up. Tap 🎤 to speak.
          </div>

          {/* Suggestion chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
            <WfChip>"Replace hot water"</WfChip>
            <WfChip>"2-coat repaint"</WfChip>
            <WfChip>"Rewire kitchen"</WfChip>
          </div>

          <div style={{ flex: 1 }} />

          {/* Input bar */}
          <div style={{
            border: solid(WF_LINE), borderRadius: 999,
            padding: '8px 8px 8px 16px', display: 'flex',
            alignItems: 'center', gap: 8, background: WF_BG,
          }}>
            <div style={{ flex: 1, fontSize: 12, color: WF_MUTED }}>Describe the job...</div>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: solid(WF_LINE), display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: WF_MUTED,
            }}>📷</div>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: WF_ORANGE, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15,
            }}>🎤</div>
          </div>
        </WfCard>
      </div>

      {/* Feed — mixed stream of things happening */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        <WfLabel style={{ margin: '4px 4px 2px' }}>Your day · 3 items</WfLabel>

        {/* Feed row: next job */}
        <WfCard p={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 6, alignSelf: 'stretch', borderRadius: 3, background: WF_ORANGE, minHeight: 36,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: WF_MUTED, letterSpacing: 1.2, textTransform: 'uppercase' }}>Next · 9:30 am</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: WF_INK }}>Hot water unit swap</div>
              <div style={{ fontSize: 10.5, color: WF_MUTED }}>Mrs Dalton · Rozelle</div>
            </div>
            <div style={{
              padding: '6px 10px', borderRadius: 10, background: WF_INK, color: '#fff',
              fontSize: 10, fontWeight: 800,
            }}>Start</div>
          </div>
        </WfCard>

        {/* Feed row: quote accepted */}
        <WfCard p={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WfCircle size={30} label="✓" tone="orange" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: WF_INK, fontWeight: 700 }}>
                <b>Dalton</b> accepted your quote
              </div>
              <div style={{ fontSize: 10.5, color: WF_MUTED }}>$1,840 · 12 min ago</div>
            </div>
            <div style={{ fontSize: 14, color: WF_MUTED }}>›</div>
          </div>
        </WfCard>

        {/* Feed row: overdue */}
        <WfCard p={12} tone="orange">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WfCircle size={30} label="!" tone="orange" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: WF_INK, fontWeight: 700 }}>2 invoices overdue</div>
              <div style={{ fontSize: 10.5, color: WF_ORANGE }}>$1,820 to chase</div>
            </div>
            <div style={{ fontSize: 14, color: WF_ORANGE }}>›</div>
          </div>
        </WfCard>

      </div>

      <WfBottomNav active={0} />
    </div>
  );
}

window.VariantB = VariantB;
