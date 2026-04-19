// AI Chat flow — 4 screens: Prompt, Clarifying, Draft, Confirm.
// The headline feature of Vargenezey: "quote with a sentence".

function AiTopBar({ title, goBack = 'home', step }) {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '56px 20px 14px',
    }}>
      <button onClick={() => Nav && Nav(goBack)} style={{
        width: 40, height: 40, borderRadius: 12,
        background: c.card, border: `1px solid ${c.lineSoft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico name="back" size={18} />
      </button>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <Eyebrow>{step}</Eyebrow>
        <div style={{
          fontSize: 15, fontWeight: 800, color: c.ink, marginTop: 2,
          letterSpacing: -0.3,
        }}>{title}</div>
      </div>
      <button style={{
        width: 40, height: 40, borderRadius: 12,
        background: c.card, border: `1px solid ${c.lineSoft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico name="more" size={18} />
      </button>
    </div>
  );
}

// Sparkle avatar for AI
function AiAvatar({ size = 32 }) {
  const { c } = useTheme();
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.6,
      background: `linear-gradient(135deg, ${c.orange}, ${c.orangeDeep})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', flexShrink: 0,
      boxShadow: `0 4px 12px ${c.orange}55`,
    }}>
      <Ico name="sparkle" size={size * 0.55} color="#fff" />
    </div>
  );
}

// Bubble components
function AiBubble({ children }) {
  const { c } = useTheme();
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
      <AiAvatar size={28} />
      <div style={{
        background: c.card, border: `1px solid ${c.lineSoft}`,
        padding: '12px 14px', borderRadius: '18px 18px 18px 4px',
        maxWidth: '78%', fontSize: 14, color: c.ink, lineHeight: 1.45,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }) {
  const { c } = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <div style={{
        background: c.black, color: '#fff',
        padding: '12px 14px', borderRadius: '18px 18px 4px 18px',
        maxWidth: '82%', fontSize: 14, lineHeight: 1.45,
      }}>
        {children}
      </div>
    </div>
  );
}

// ═══ SCREEN 1: AI Chat — prompt (empty state) ═══════════════════
function AiChatPrompt() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const suggestions = [
    'Swap hot water at Dalton\'s for $1,840',
    'Quote bathroom reno for K Ng, Newtown',
    'Invoice last week\'s tap fix for J Chen',
  ];
  return (
    <Screen nav="ai">
      <AiTopBar title="New quote" step="AI · Step 1 of 4" goBack="home" />

      {/* Hero prompt area */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          textAlign: 'center', padding: '32px 12px 28px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <AiAvatar size={64} />
          </div>
          <div style={{
            fontSize: 30, fontWeight: 800, color: c.ink,
            letterSpacing: -1, lineHeight: 1.05,
          }}>
            What did you<br/>
            <span style={{ color: c.orange }}>quote today?</span>
          </div>
          <div style={{
            fontSize: 13, color: c.mutedHi, marginTop: 10, lineHeight: 1.45,
            maxWidth: 260, margin: '10px auto 0',
          }}>
            Type, talk, or photograph it. I'll turn any of them into a proper quote.
          </div>
        </div>

        {/* Suggestions */}
        <Eyebrow style={{ marginBottom: 10 }}>Try one of these</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => Nav && Nav('ai-clarify')} style={{
              textAlign: 'left', padding: '14px 16px', borderRadius: 16,
              background: c.card, border: `1px solid ${c.lineSoft}`,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontWeight: 600, color: c.ink,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}>
              <Ico name="sparkle" size={16} color={c.orange} />
              <span style={{ flex: 1 }}>{s}</span>
              <Arrow size={14} color={c.muted} />
            </button>
          ))}
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{
            flex: 1, height: 56, borderRadius: 16, background: c.card,
            border: `1px solid ${c.lineSoft}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 13, fontWeight: 700, color: c.ink,
          }}>
            <Ico name="camera" size={18} /> Photo
          </button>
          <button style={{
            flex: 1, height: 56, borderRadius: 16, background: c.card,
            border: `1px solid ${c.lineSoft}`, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: 13, fontWeight: 700, color: c.ink,
          }}>
            <Ico name="quote" size={18} /> Template
          </button>
        </div>
      </div>

      {/* Composer — bottom docked */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: c.card, border: `1px solid ${c.lineMid}`,
          borderRadius: 26, padding: '6px 6px 6px 18px',
          boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            flex: 1, fontSize: 14, color: c.muted, fontWeight: 500,
            padding: '10px 0',
          }}>
            Describe a job…
          </div>
          <button style={{
            width: 40, height: 40, borderRadius: '50%',
            background: c.paperDeep, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="mic" size={18} />
          </button>
          <button onClick={() => Nav && Nav('ai-clarify')} style={{
            width: 40, height: 40, borderRadius: '50%',
            background: c.orange, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico name="send" size={16} color="#fff" />
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ═══ SCREEN 2: AI Chat — clarifying questions ═══════════════════
function AiChatClarify() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <Screen nav="ai">
      <AiTopBar title="New quote" step="AI · Step 2 of 4" goBack="ai-entry" />

      <div style={{ padding: '8px 20px 0' }}>
        <UserBubble>
          Swap the 315L hot water unit at Dalton's place —
          same brand, new expansion valve.
        </UserBubble>

        <AiBubble>
          Got it. I'll draft a <b>hot water replacement</b> quote for <b>Dalton</b>.
          A couple of quick questions:
        </AiBubble>

        {/* Q1 answered */}
        <AiBubble>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Which model?</div>
          <div style={{ fontSize: 12.5, color: c.mutedHi }}>
            Last invoice shows a Rheem 315L Stellar.
          </div>
        </AiBubble>
        <UserBubble>Same — Rheem 315L Stellar, electric.</UserBubble>

        {/* Q2 — chips */}
        <AiBubble>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Callout fee?</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['$0 (waived)', '$120 standard', '$180 after hrs'].map(v => (
              <button key={v} style={{
                padding: '8px 12px', borderRadius: 999,
                border: `1.5px solid ${v === '$120 standard' ? c.orange : c.lineMid}`,
                background: v === '$120 standard' ? c.orangeSoft : c.card,
                color: v === '$120 standard' ? c.orangeDeep : c.ink,
                fontSize: 12, fontWeight: 800,
              }}>{v}</button>
            ))}
          </div>
        </AiBubble>

        <AiBubble>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Schedule?</div>
          <div style={{ fontSize: 12.5, color: c.mutedHi }}>
            I've blocked <b style={{ color: c.ink }}>Tue 9:30 am</b> — your only free 2hr slot.
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button style={{
              padding: '8px 12px', borderRadius: 999,
              background: c.green, color: '#fff',
              fontSize: 12, fontWeight: 800,
            }}>✓ Lock it in</button>
            <button style={{
              padding: '8px 12px', borderRadius: 999,
              background: c.card, color: c.ink, border: `1px solid ${c.lineMid}`,
              fontSize: 12, fontWeight: 700,
            }}>Pick another</button>
          </div>
        </AiBubble>
      </div>

      {/* AI typing indicator */}
      <div style={{ padding: '6px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AiAvatar size={28} />
        <div style={{
          background: c.card, border: `1px solid ${c.lineSoft}`,
          padding: '12px 14px', borderRadius: 18,
          display: 'flex', gap: 4,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: c.muted,
              opacity: 0.5, /* [anim: pulse stagger each 0.2s] */
            }} />
          ))}
        </div>
      </div>

      {/* Preview bar — collapsed draft pill */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
      }}>
        <button onClick={() => Nav && Nav('ai-draft')} style={{
          width: '100%', padding: 14, borderRadius: 22,
          background: `linear-gradient(135deg, ${c.orange}, ${c.orangeDeep})`,
          color: '#fff', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: `0 14px 28px ${c.orange}55`,
          textAlign: 'left',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Ico name="sparkle" size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: 1.4,
              color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase',
            }}>Draft ready — tap to review</div>
            <div style={{
              fontSize: 15, fontWeight: 800, letterSpacing: -0.3,
              marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              Hot water swap — Dalton · $1,840
            </div>
          </div>
          <Arrow size={18} color="#fff" />
        </button>
      </div>
    </Screen>
  );
}

// ═══ SCREEN 3: AI Chat — draft quote preview ════════════════════
function AiChatDraft() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const lines = [
    { n: 'Rheem 315L Stellar electric HWU', q: 1, p: 1420, sub: 'Supply only' },
    { n: 'Removal + install labour', q: 2, p: 180, sub: '2 hrs @ $90' },
    { n: 'Expansion valve + fittings', q: 1, p: 85 },
    { n: 'Callout fee', q: 1, p: 120 },
  ];
  const subtotal = lines.reduce((s, l) => s + l.p * l.q, 0);
  const gst = Math.round(subtotal * 0.1);
  const total = subtotal + gst;
  return (
    <Screen nav="ai">
      <AiTopBar title="Review draft" step="AI · Step 3 of 4" goBack="ai-clarify" />

      <div style={{ padding: '14px 20px 0' }}>
        {/* The quote 'paper' */}
        <div style={{
          background: c.card, borderRadius: 22,
          border: `1px solid ${c.lineSoft}`, padding: 20,
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Orange corner glow */}
          <div style={{
            position: 'absolute', top: -60, right: -60, width: 160, height: 160,
            background: `radial-gradient(circle, ${c.orange}1f, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <Eyebrow>Quote · Draft</Eyebrow>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.ink, letterSpacing: -0.6, marginTop: 2 }}>
                Hot water swap
              </div>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
                Q-2048 · Sun 19 Apr
              </div>
            </div>
            <StatusPill tone="draft">Draft</StatusPill>
          </div>

          {/* Customer */}
          <div style={{
            padding: '10px 12px', borderRadius: 12,
            background: c.paperDeep, marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: c.ink,
              color: c.orange, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800,
            }}>JD</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.ink }}>Jack Dalton</div>
              <div style={{ fontSize: 11, color: c.muted }}>42 Harbour St, Rozelle · 0412 889 221</div>
            </div>
          </div>

          {/* Line items */}
          <div style={{ marginBottom: 12 }}>
            {lines.map((l, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{l.n}</div>
                  {l.sub ? <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{l.sub}</div> : null}
                </div>
                <div style={{ fontSize: 12, color: c.muted, width: 30, textAlign: 'right', flexShrink: 0 }}>×{l.q}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: c.ink, textAlign: 'right', minWidth: 60 }}>
                  ${(l.p * l.q).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <button style={{
            width: '100%', padding: '10px', borderRadius: 10,
            background: c.orangeSoft, color: c.orangeDeep,
            fontSize: 12, fontWeight: 800, border: `1px dashed ${c.orange}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginBottom: 14,
          }}>
            <Ico name="plus" size={14} color={c.orangeDeep} /> Add line item
          </button>

          {/* Totals */}
          <div style={{ borderTop: `1px solid ${c.lineSoft}`, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.mutedHi, marginBottom: 4 }}>
              <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: c.mutedHi, marginBottom: 10 }}>
              <span>GST (10%)</span><span>${gst.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: c.ink, letterSpacing: 0.2 }}>TOTAL</span>
              <span style={{ fontSize: 30, fontWeight: 800, color: c.orange, letterSpacing: -0.8, lineHeight: 1 }}>
                ${total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* AI meta */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
          padding: 12, borderRadius: 14,
          background: c.orangeSoft, border: `1px solid rgba(242,106,42,0.25)`,
        }}>
          <Ico name="sparkle" size={18} color={c.orangeDeep} />
          <div style={{ flex: 1, fontSize: 12, color: c.orangeDeep, fontWeight: 600, lineHeight: 1.4 }}>
            Pricing matched to your last 3 similar jobs. <b>Nothing surprising.</b>
          </div>
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
        display: 'flex', gap: 8,
      }}>
        <button style={{
          flex: 1, height: 54, borderRadius: 18,
          background: c.card, border: `1px solid ${c.lineMid}`,
          fontSize: 14, fontWeight: 800, color: c.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 10px 24px rgba(0,0,0,0.06)',
        }}>
          <Ico name="edit" size={16} /> Tweak
        </button>
        <button onClick={() => Nav && Nav('ai-confirm')} style={{
          flex: 2, height: 54, borderRadius: 18,
          background: c.orange, color: '#fff',
          fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 10px 24px ${c.orange}66`,
        }}>
          Looks right — continue <Arrow size={16} color="#fff" />
        </button>
      </div>
    </Screen>
  );
}

// ═══ SCREEN 4: AI Chat — confirm & send ═════════════════════════
function AiChatConfirm() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <Screen nav="ai">
      <AiTopBar title="Send it" step="AI · Step 4 of 4" goBack="ai-draft" />

      <div style={{ padding: '20px 20px 0' }}>
        {/* Big hero summary */}
        <div style={{
          background: c.black, borderRadius: 24, padding: 22,
          color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40, width: 160, height: 160,
            background: `radial-gradient(circle, ${c.orange}88, transparent 70%)`,
            opacity: 0.4, pointerEvents: 'none',
          }} />
          <Eyebrow color="rgba(255,255,255,0.6)">Quote Q-2048</Eyebrow>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, marginTop: 4, lineHeight: 1.05 }}>
            $2,004<span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 700 }}> inc GST</span>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Hot water swap · Jack Dalton · Tue 9:30 am
          </div>
        </div>

        {/* Delivery options */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>How to send</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: 'msg',   label: 'SMS with web link',  sub: '0412 889 221', active: true },
            { icon: 'send',  label: 'Email PDF',          sub: 'jack@dalton.com.au' },
            { icon: 'download', label: 'Download PDF',    sub: 'Save for later' },
          ].map((o) => (
            <button key={o.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 16,
              background: c.card,
              border: o.active ? `2px solid ${c.orange}` : `1px solid ${c.lineSoft}`,
              boxShadow: o.active ? `0 4px 12px ${c.orange}33` : '0 1px 3px rgba(0,0,0,0.03)',
              textAlign: 'left',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: o.active ? c.orangeSoft : c.paperDeep,
                color: o.active ? c.orangeDeep : c.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Ico name={o.icon} size={18} color={o.active ? c.orangeDeep : c.ink} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c.ink }}>{o.label}</div>
                <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>{o.sub}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                border: `2px solid ${o.active ? c.orange : c.lineMid}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: o.active ? c.orange : 'transparent',
              }}>
                {o.active ? <Ico name="check" size={12} color="#fff" /> : null}
              </div>
            </button>
          ))}
        </div>

        {/* Message preview */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>SMS preview</Eyebrow>
        <div style={{
          background: c.paperDeep, borderRadius: 16, padding: 14,
          fontSize: 13, color: c.mutedHi, lineHeight: 1.5,
        }}>
          G'day Jack — quote for the hot water swap: $2,004 inc GST. Booked for Tue 9:30 am. Tap to accept: <span style={{ color: c.orange, fontWeight: 700 }}>vgn.ec/q/2048</span>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
      }}>
        <button onClick={() => Nav && Nav('quotes-detail')} style={{
          width: '100%', height: 58, borderRadius: 22,
          background: c.orange, color: '#fff',
          fontSize: 16, fontWeight: 800, letterSpacing: -0.3,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: `0 14px 30px ${c.orange}66`,
          /* [anim: press → ripple + haptic] */
        }}>
          <Ico name="send" size={18} color="#fff" /> Send quote to Jack
        </button>
      </div>
    </Screen>
  );
}

// Wrap all four to apply ThemeProvider from the dark toggle
function __withTheme(Comp) {
  return function Wrapped() {
    const dark = localStorage.getItem('vgn_proto_dark') === '1';
    return <ThemeProvider dark={dark}><Comp /></ThemeProvider>;
  };
}

Object.assign(window, {
  AiChatPrompt:   __withTheme(AiChatPrompt),
  AiChatClarify:  __withTheme(AiChatClarify),
  AiChatDraft:    __withTheme(AiChatDraft),
  AiChatConfirm:  __withTheme(AiChatConfirm),
});
