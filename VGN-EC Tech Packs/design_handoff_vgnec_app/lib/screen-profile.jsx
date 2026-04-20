// Profile / Settings.

function _ProfileScreen() {
  const { c, dark } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <Screen nav="profile">
      {/* Hero */}
      <div style={{
        position: 'relative', padding: '56px 20px 24px',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -100, width: 300, height: 300,
          background: `radial-gradient(circle, ${c.orange}33, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: c.ink, color: c.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800,
            boxShadow: `0 8px 24px ${c.orange}33`,
          }}>AH</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.ink, letterSpacing: -0.5 }}>
              Andy Hollister
            </div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              Vargenezey Electrical · ABN 52 889 221 143
            </div>
            <div style={{
              marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 999, background: c.orangeSoft,
              fontSize: 9.5, fontWeight: 800, letterSpacing: 0.7,
              color: c.orangeDeep, textTransform: 'uppercase',
            }}>✦ Pro plan</div>
          </div>
          <button style={{
            width: 40, height: 40, borderRadius: 12,
            background: c.card, border: `1px solid ${c.lineSoft}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Ico name="edit" size={18} /></button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ padding: '0 20px 0', display: 'flex', gap: 8 }}>
        {[
          { l: 'Jobs this month', v: '42' },
          { l: 'Revenue',         v: '$14.2k' },
          { l: 'On-time',         v: '96%' },
        ].map(s => (
          <div key={s.l} style={{
            flex: 1, padding: 14, borderRadius: 16,
            background: c.card, border: `1px solid ${c.lineSoft}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.ink, letterSpacing: -0.4, lineHeight: 1 }}>
              {s.v}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: c.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 6 }}>
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* Groups */}
      <SettingsGroup title="Business" items={[
        { icon: 'quote',    l: 'Business details',    sub: 'ABN, logo, invoice footer' },
        { icon: 'invoice',  l: 'Invoice & quote settings', sub: 'Numbering, GST, payment terms' },
        { icon: 'calendar', l: 'Working hours',       sub: 'Mon–Fri · 7:30 am – 4:00 pm' },
        { icon: 'pin',      l: 'Service area',        sub: 'Inner West Sydney · 15 km' },
      ]} />

      <SettingsGroup title="AI & automations" items={[
        { icon: 'sparkle', l: 'AI quoting',       sub: 'Tone, default margins, templates', badge: 'Pro' },
        { icon: 'bell',    l: 'Reminders',        sub: 'Overdue nudges, review requests' },
        { icon: 'msg',     l: 'SMS templates',    sub: '4 templates · 1 draft' },
      ]} />

      <SettingsGroup title="Preferences" items={[
        { icon: 'sun',  l: 'Appearance',     sub: dark ? 'Dark · auto-switch off' : 'Light · system default' },
        { icon: 'bell', l: 'Notifications',  sub: 'Quotes, invoices, reviews' },
      ]} />

      <SettingsGroup title="Account" items={[
        { icon: 'gear',   l: 'Subscription', sub: 'Pro · $39/mo · next renewal 14 May' },
        { icon: 'logout', l: 'Sign out',     sub: '', danger: true },
      ]} />

      <div style={{ padding: '28px 20px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: c.muted, fontWeight: 600 }}>
          Admin for people who'd rather be on the tools.
        </div>
        <div style={{ fontSize: 10, color: c.muted, fontWeight: 800, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
          VARGENEZEY · v1.0
        </div>
      </div>
    </Screen>
  );
}

function SettingsGroup({ title, items }) {
  const { c } = useTheme();
  return (
    <div style={{ padding: '22px 20px 0' }}>
      <Eyebrow style={{ marginBottom: 8 }}>{title}</Eyebrow>
      <div style={{
        background: c.card, border: `1px solid ${c.lineSoft}`,
        borderRadius: 16, overflow: 'hidden',
      }}>
        {items.map((it, i) => (
          <button key={it.l} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            padding: '14px 14px', textAlign: 'left',
            borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: it.danger ? c.redSoft : c.paperDeep,
              color: it.danger ? c.red : c.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ico name={it.icon} size={16} color={it.danger ? c.red : c.ink} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: it.danger ? c.red : c.ink,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {it.l}
                {it.badge ? (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 999,
                    background: c.orangeSoft, color: c.orangeDeep, letterSpacing: 0.5,
                  }}>{it.badge}</span>
                ) : null}
              </div>
              {it.sub ? <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>{it.sub}</div> : null}
            </div>
            <Arrow size={14} color={c.muted} />
          </button>
        ))}
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
Object.assign(window, { ProfileScreen: __wrap(_ProfileScreen) });
