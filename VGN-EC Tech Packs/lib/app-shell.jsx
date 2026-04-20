// App shell — shared tokens, atoms, and primitives used across every screen.
// Every screen script relies on these being on window.

const VC = {
  // paper/ink
  ink: '#141310',
  paper: '#f7f4ee',
  paperDeep: '#efe9dd',
  card: '#ffffff',
  cream: '#fff8ef',
  // orange family
  orange: '#f26a2a',
  orangeDeep: '#d94d0e',
  orangeSoft: '#ffe6d3',
  // status
  blue: '#1f6feb',
  blueSoft: '#eaf2ff',
  blueBorder: '#c8dcff',
  green: '#2a9d4c',
  greenSoft: '#e5f6eb',
  greenBorder: '#bde2c9',
  red: '#d23b3b',
  redSoft: '#fde5e5',
  // text
  muted: 'rgba(20,19,16,0.55)',
  mutedHi: 'rgba(20,19,16,0.72)',
  lineSoft: 'rgba(20,19,16,0.08)',
  lineMid: 'rgba(20,19,16,0.14)',
  // black (warmer than ink, used for hero cards)
  black: '#0f0e0b',
};

// Dark variants applied via a context + helper
const VCDark = {
  ink: '#f5f3ef',
  paper: '#17150f',
  paperDeep: '#1f1c15',
  card: '#221e17',
  cream: '#231d12',
  orange: '#ff7a3c',
  orangeDeep: '#f26a2a',
  orangeSoft: 'rgba(242,106,42,0.18)',
  blue: '#5a9cff',
  blueSoft: 'rgba(90,156,255,0.15)',
  blueBorder: 'rgba(90,156,255,0.3)',
  green: '#4ec472',
  greenSoft: 'rgba(78,196,114,0.15)',
  greenBorder: 'rgba(78,196,114,0.3)',
  red: '#ff6a6a',
  redSoft: 'rgba(255,106,106,0.15)',
  muted: 'rgba(245,243,239,0.5)',
  mutedHi: 'rgba(245,243,239,0.72)',
  lineSoft: 'rgba(255,255,255,0.06)',
  lineMid: 'rgba(255,255,255,0.12)',
  black: '#000000',
};

const ThemeCtx = React.createContext({ c: VC, dark: false });
function useTheme() { return React.useContext(ThemeCtx); }

function ThemeProvider({ dark, children }) {
  const value = React.useMemo(() => ({
    c: dark ? VCDark : VC,
    dark: !!dark,
  }), [dark]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

// ─── Atoms ─────────────────────────────────────────────────────

function Eyebrow({ children, color, style = {} }) {
  const { c } = useTheme();
  return <div style={{
    fontSize: 10, fontWeight: 800, letterSpacing: 2,
    color: color || c.muted, textTransform: 'uppercase', ...style,
  }}>{children}</div>;
}

function Dot({ color, size = 8, pulse = false }) {
  const { c } = useTheme();
  const col = color || c.orange;
  return <span style={{
    display: 'inline-block', width: size, height: size,
    borderRadius: '50%', background: col, flexShrink: 0,
    boxShadow: pulse ? `0 0 0 4px ${col}22, 0 0 0 8px ${col}11` : 'none',
  }} />;
}

// Chevron/arrow
function Arrow({ size = 14, color, rot = 0 }) {
  const { c } = useTheme();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ transform: `rotate(${rot}deg)`, flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6" stroke={color || c.ink} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Generic icon — we use unicode/emoji-safe glyphs OR inline SVGs.
function Ico({ name, size = 20, color }) {
  const { c } = useTheme();
  const col = color || c.ink;
  const sw = 2.1;
  const P = { stroke: col, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const svgs = {
    home: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-9z"/></svg>,
    quote: <svg width={size} height={size} viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2" {...P}/><path {...P} d="M9 8h6M9 12h6M9 16h4"/></svg>,
    invoice: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path {...P} d="M9 9h6M9 13h4"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" {...P}/><path {...P} d="M3 10h18M8 3v4M16 3v4"/></svg>,
    profile: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" {...P}/><path {...P} d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
    back: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M15 6l-6 6 6 6"/></svg>,
    close: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M6 6l12 12M18 6L6 18"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M12 5v14M5 12h14"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" {...P}/><path {...P} d="M20 20l-3.5-3.5"/></svg>,
    filter: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M4 6h16M7 12h10M10 18h4"/></svg>,
    more: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" fill={col} stroke="none"/><circle cx="12" cy="12" r="1.5" fill={col} stroke="none"/><circle cx="19" cy="12" r="1.5" fill={col} stroke="none"/></svg>,
    mic: <svg width={size} height={size} viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="12" rx="3" {...P}/><path {...P} d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>,
    send: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M4 12l16-8-6 16-3-7-7-1z"/></svg>,
    sparkle: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/></svg>,
    pin: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5" {...P}/></svg>,
    phone: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>,
    msg: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H6a2 2 0 0 1-2-2V6z"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M5 12l5 5L20 7"/></svg>,
    clock: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" {...P}/><path {...P} d="M12 7v5l3 2"/></svg>,
    play: <svg width={size} height={size} viewBox="0 0 24 24"><path fill={col} stroke="none" d="M7 5v14l12-7z"/></svg>,
    pause: <svg width={size} height={size} viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill={col} stroke="none" rx="1"/><rect x="14" y="5" width="4" height="14" fill={col} stroke="none" rx="1"/></svg>,
    camera: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4" {...P}/></svg>,
    bell: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M6 16V10a6 6 0 0 1 12 0v6l2 3H4l2-3zM10 21a2 2 0 0 0 4 0"/></svg>,
    gear: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" {...P}/><path {...P} d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M16 17l5-5-5-5M21 12H9M13 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7"/></svg>,
    download: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4"/></svg>,
    eye: <svg width={size} height={size} viewBox="0 0 24 24"><path {...P} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3" {...P}/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" {...P}/><path {...P} d="M12 7v6M12 16v0.5"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" {...P}/><path {...P} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/></svg>,
    grid: <svg width={size} height={size} viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" {...P}/><rect x="13" y="4" width="7" height="7" rx="1.5" {...P}/><rect x="4" y="13" width="7" height="7" rx="1.5" {...P}/><rect x="13" y="13" width="7" height="7" rx="1.5" {...P}/></svg>,
  };
  return svgs[name] || <span style={{ width: size, height: size, display: 'inline-block' }}>?</span>;
}

// ─── Top bar / sub-screen header ───────────────────────────────
function ScreenHeader({ title, eyebrow, onBack, onClose, right, goTo }) {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '56px 20px 0',
    }}>
      {onBack ? (
        <button onClick={() => onBack()} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Ico name="back" size={18} />
        </button>
      ) : null}
      {(goTo && !onBack) ? (
        <button onClick={() => Nav && Nav(goTo)} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Ico name="back" size={18} />
        </button>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <div style={{
          fontSize: 22, fontWeight: 800, color: c.ink,
          letterSpacing: -0.5, marginTop: eyebrow ? 2 : 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{title}</div>
      </div>
      {right}
      {onClose ? (
        <button onClick={() => onClose()} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Ico name="close" size={18} />
        </button>
      ) : null}
    </div>
  );
}

// Floating liquid-glass bottom nav — used across all screens
function FloatingNav({ active, onNav }) {
  const { c, dark } = useTheme();
  const Nav = window.__vgnNav;
  const handle = (screen) => {
    if (onNav) onNav(screen);
    if (Nav) Nav(screen);
  };
  const items = [
    { id: 'home',          label: 'Home',     icon: 'home',     match: 'home' },
    { id: 'quotes-list',   label: 'Quotes',   icon: 'quote',    match: 'quotes' },
    { id: 'invoices-list', label: 'Invoices', icon: 'invoice',  match: 'invoices' },
    { id: 'calendar',      label: 'Calendar', icon: 'calendar', match: 'calendar' },
    { id: 'profile',       label: 'Profile',  icon: 'profile',  match: 'profile' },
  ];
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 22, zIndex: 40,
      transform: 'translateX(-50%)',
      width: 'calc(100% - 44px)', maxWidth: 340,
      borderRadius: 30, padding: 5, display: 'flex',
      background: dark
        ? 'linear-gradient(180deg, rgba(40,36,28,0.7) 0%, rgba(30,27,21,0.55) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.38) 100%)',
      backdropFilter: 'blur(28px) saturate(220%)',
      WebkitBackdropFilter: 'blur(28px) saturate(220%)',
      border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.7)',
      boxShadow: dark
        ? '0 18px 40px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3), inset 0 1.5px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.3)'
        : '0 18px 40px rgba(20,19,16,0.18), 0 4px 12px rgba(20,19,16,0.08), inset 0 1.5px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(20,19,16,0.06), inset 1px 0 0 rgba(255,255,255,0.5), inset -1px 0 0 rgba(255,255,255,0.5)',
    }}>
      <div style={{
        position: 'absolute', top: 1, left: 10, right: 10, height: 12,
        borderRadius: 30,
        background: dark
          ? 'linear-gradient(180deg, rgba(255,255,255,0.15), transparent)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.7), transparent)',
        pointerEvents: 'none',
      }} />
      {items.map((it) => {
        const isActive = (active || '').startsWith(it.match);
        const col = isActive ? c.orange : (dark ? 'rgba(245,243,239,0.55)' : 'rgba(20,19,16,0.5)');
        return (
          <button key={it.id} onClick={() => handle(it.id)} style={{
            flex: 1, padding: '8px 4px 7px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 2,
            borderRadius: 24, position: 'relative',
            background: isActive
              ? (dark
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))')
              : 'transparent',
            boxShadow: isActive
              ? (dark
                  ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 2px 8px rgba(20,19,16,0.08), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(20,19,16,0.04)')
              : 'none',
            border: isActive
              ? (dark ? '0.5px solid rgba(255,255,255,0.2)' : '0.5px solid rgba(255,255,255,0.9)')
              : 'none',
          }}>
            <Ico name={it.icon} size={20} color={col} />
            <div style={{
              fontSize: 9, fontWeight: 800, color: col, letterSpacing: 0.3,
              opacity: isActive ? 1 : 0, height: 10,
            }}>{it.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Page shell ────────────────────────────────────────────────
function Screen({ children, nav = 'home', dark, padding = 120 }) {
  const { c } = useTheme();
  return (
    <div style={{
      background: c.paper, minHeight: '100%', paddingBottom: padding,
      fontFamily: 'Manrope, -apple-system, system-ui, sans-serif',
      color: c.ink, position: 'relative', overflow: 'hidden',
    }}>
      {children}
      {nav !== false && <FloatingNav active={nav} />}
    </div>
  );
}

// ─── Shared card widget ────────────────────────────────────────
function Card({ children, style = {}, onClick, pad = 16 }) {
  const { c } = useTheme();
  return (
    <div onClick={onClick} style={{
      background: c.card, border: `1px solid ${c.lineSoft}`,
      borderRadius: 18, padding: pad,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Status pill
function StatusPill({ tone = 'muted', children, size = 'sm' }) {
  const { c } = useTheme();
  const tones = {
    draft:    { bg: c.paperDeep, fg: c.mutedHi, bd: c.lineMid },
    sent:     { bg: c.blueSoft,  fg: c.blue,    bd: c.blueBorder },
    viewed:   { bg: c.blueSoft,  fg: c.blue,    bd: c.blueBorder },
    accepted: { bg: c.greenSoft, fg: c.green,   bd: c.greenBorder },
    paid:     { bg: c.greenSoft, fg: c.green,   bd: c.greenBorder },
    overdue:  { bg: c.orangeSoft, fg: c.orangeDeep, bd: 'rgba(242,106,42,0.3)' },
    urgent:   { bg: c.redSoft,   fg: c.red,     bd: 'rgba(210,59,59,0.3)' },
    active:   { bg: c.orangeSoft, fg: c.orangeDeep, bd: 'rgba(242,106,42,0.3)' },
    muted:    { bg: c.paperDeep, fg: c.mutedHi, bd: c.lineMid },
  };
  const t = tones[tone] || tones.muted;
  const sizes = {
    sm: { fs: 10, px: 8,  py: 2, ls: 1.2 },
    md: { fs: 11, px: 10, py: 3, ls: 1.0 },
  };
  const s = sizes[size] || sizes.sm;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: `${s.py}px ${s.px}px`, borderRadius: 999,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontSize: s.fs, fontWeight: 800, letterSpacing: s.ls,
      textTransform: 'uppercase', lineHeight: 1.4, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// Primary / ghost buttons
function PrimaryBtn({ children, onClick, icon, style = {}, full }) {
  const { c } = useTheme();
  return (
    <button onClick={onClick} style={{
      height: 52, padding: '0 20px', borderRadius: 16, background: c.orange,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, fontSize: 15, fontWeight: 800, letterSpacing: -0.2,
      boxShadow: '0 6px 20px rgba(242,106,42,0.35)',
      width: full ? '100%' : undefined,
      ...style,
    }}>
      {icon ? <Ico name={icon} size={18} color="#fff" /> : null}
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick, icon, style = {} }) {
  const { c } = useTheme();
  return (
    <button onClick={onClick} style={{
      height: 44, padding: '0 16px', borderRadius: 14, background: c.card,
      color: c.ink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 8, fontSize: 13, fontWeight: 700, border: `1px solid ${c.lineMid}`,
      ...style,
    }}>
      {icon ? <Ico name={icon} size={16} /> : null}
      {children}
    </button>
  );
}

// Section label row (eyebrow + "see all" link)
function SectionHead({ eyebrow, title, linkLabel, onLink }) {
  const { c } = useTheme();
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      padding: '0 20px', marginBottom: 10,
    }}>
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <div style={{
          fontSize: 18, fontWeight: 800, color: c.ink,
          letterSpacing: -0.4, marginTop: eyebrow ? 2 : 0,
        }}>{title}</div>
      </div>
      {linkLabel ? (
        <button onClick={onLink} style={{
          fontSize: 11, fontWeight: 800, color: c.orange, letterSpacing: 0.2,
        }}>{linkLabel} →</button>
      ) : null}
    </div>
  );
}

Object.assign(window, {
  VC, VCDark, ThemeProvider, ThemeCtx, useTheme,
  Eyebrow, Dot, Arrow, Ico,
  ScreenHeader, FloatingNav, Screen, Card, StatusPill,
  PrimaryBtn, GhostBtn, SectionHead,
});
