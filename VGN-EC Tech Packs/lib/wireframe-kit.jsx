// Lo-fi wireframe primitives — greyscale blocks, ink accents, orange hero accent.
// Meant to read as "wireframe" not "hi-fi" — rough boxes, grid lines,
// hatched placeholders, handwritten labels optional.

const WF_INK = '#1a1a1a';
const WF_BG = '#fafaf7';
const WF_LINE = '#c9c5bc';
const WF_LINE_STRONG = '#8a857a';
const WF_MUTED = '#6b6760';
const WF_FILL = '#ececea';
const WF_FILL_2 = '#e0ddd5';
const WF_ORANGE = '#f26a2a';   // tailwind: hsl(18 90% 55%)
const WF_ORANGE_SOFT = '#fff1e8';

// Dashed border utility
const dashed = (c = WF_LINE) => `1.5px dashed ${c}`;
const solid = (c = WF_LINE) => `1.5px solid ${c}`;

// A "box" placeholder with diagonal stroke (image/chart slot)
function WfBox({ h = 80, label, solid: isSolid, tone = 'default', style = {} }) {
  const bg = tone === 'orange' ? WF_ORANGE_SOFT : tone === 'dark' ? '#2a2824' : WF_FILL;
  const bc = tone === 'orange' ? WF_ORANGE : tone === 'dark' ? '#2a2824' : WF_LINE;
  const fg = tone === 'dark' ? '#fff' : WF_MUTED;
  return (
    <div style={{
      height: h, width: '100%', borderRadius: 14,
      border: isSolid ? solid(bc) : dashed(bc),
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: fg, fontSize: 11, letterSpacing: 0.3, textTransform: 'uppercase',
      fontWeight: 700, position: 'relative', ...style,
    }}>
      {label}
    </div>
  );
}

// Horizontal line-stand-in for text
function WfText({ w = '100%', h = 8, c = WF_LINE, style = {} }) {
  return <div style={{ width: w, height: h, borderRadius: 4, background: c, ...style }} />;
}

// Stack of text lines
function WfTextLines({ lines = 2, gap = 6, widths, c = WF_LINE, h = 8 }) {
  const ws = widths || Array(lines).fill('100%');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {ws.slice(0, lines).map((w, i) => (
        <WfText key={i} w={w} h={h} c={c} />
      ))}
    </div>
  );
}

// Round avatar/icon stub
function WfCircle({ size = 32, tone = 'default', label, style = {} }) {
  const bg = tone === 'orange' ? WF_ORANGE : tone === 'dark' ? WF_INK : WF_FILL_2;
  const fg = tone === 'default' ? WF_MUTED : '#fff';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, flexShrink: 0, ...style,
    }}>{label}</div>
  );
}

// Tag/chip
function WfChip({ children, tone = 'default', style = {} }) {
  const bg = tone === 'orange' ? WF_ORANGE_SOFT : tone === 'dark' ? WF_INK : '#fff';
  const bc = tone === 'orange' ? WF_ORANGE : tone === 'dark' ? WF_INK : WF_LINE;
  const fg = tone === 'orange' ? WF_ORANGE : tone === 'dark' ? '#fff' : WF_MUTED;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      border: solid(bc), background: bg, color: fg,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
      ...style,
    }}>{children}</span>
  );
}

// Wireframe "card" wrapper
function WfCard({ children, tone = 'default', p = 14, style = {} }) {
  const bg = tone === 'orange' ? WF_ORANGE_SOFT : tone === 'dark' ? '#232120' : '#fff';
  const bc = tone === 'orange' ? WF_ORANGE : tone === 'dark' ? '#232120' : WF_LINE;
  return (
    <div style={{
      background: bg, border: solid(bc), borderRadius: 18,
      padding: p, ...style,
    }}>{children}</div>
  );
}

// Section label (small caps)
function WfLabel({ children, style = {} }) {
  return (
    <div style={{
      fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
      letterSpacing: 1.4, color: WF_MUTED, ...style,
    }}>{children}</div>
  );
}

// Lo-fi bottom nav — 5 dots
function WfBottomNav({ active = 0 }) {
  const items = ['Home', 'Quotes', 'Invoices', 'Calendar', 'Profile'];
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 28, zIndex: 10,
      background: '#fff', border: solid(WF_LINE),
      borderRadius: 999, padding: '8px 6px',
      display: 'flex', justifyContent: 'space-around',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    }}>
      {items.map((label, i) => (
        <div key={label} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 3, padding: '4px 8px', borderRadius: 999,
          background: i === active ? WF_ORANGE_SOFT : 'transparent',
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4,
            border: solid(i === active ? WF_ORANGE : WF_LINE_STRONG),
            background: i === active ? WF_ORANGE : 'transparent',
          }} />
          <div style={{
            fontSize: 8.5, fontWeight: 700,
            color: i === active ? WF_ORANGE : WF_MUTED,
            letterSpacing: 0.3,
          }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// iOS-ish header — date label + greeting
function WfHeader({ title = 'Good morning', date = 'Sun 19 Apr', action = '⚙' }) {
  return (
    <div style={{
      padding: '56px 20px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: WF_MUTED, textTransform: 'uppercase' }}>
          {date}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: WF_INK, marginTop: 2 }}>
          {title}
        </div>
      </div>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: solid(WF_LINE), background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: WF_MUTED,
      }}>{action}</div>
    </div>
  );
}

Object.assign(window, {
  WF_INK, WF_BG, WF_LINE, WF_LINE_STRONG, WF_MUTED,
  WF_FILL, WF_FILL_2, WF_ORANGE, WF_ORANGE_SOFT,
  WfBox, WfText, WfTextLines, WfCircle, WfChip, WfCard, WfLabel,
  WfBottomNav, WfHeader,
});
