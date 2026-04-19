// Calendar — week view.

function _CalendarScreen() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const [dayIdx, setDayIdx] = React.useState(1); // Tuesday selected
  const days = [
    { d: 'Mon', n: 20, count: 2 },
    { d: 'Tue', n: 21, count: 3 },
    { d: 'Wed', n: 22, count: 1 },
    { d: 'Thu', n: 23, count: 0 },
    { d: 'Fri', n: 24, count: 2 },
    { d: 'Sat', n: 25, count: 1 },
    { d: 'Sun', n: 26, count: 0 },
  ];
  // hours on selected day
  const events = [
    { start: 9.5,  end: 11.25, title: 'Hot water swap',         cust: 'Dalton', tone: 'next' },
    { start: 12.5, end: 13,    title: 'Leaking tap fix',        cust: 'Chen',   tone: 'normal' },
    { start: 15,   end: 15.75, title: 'Bathroom reno — quote',  cust: 'K Ng',   tone: 'quote' },
  ];
  const hourH = 54;
  const startH = 7;
  const endH = 19;

  return (
    <Screen nav="calendar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 0' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Week 16 · April</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.ink, letterSpacing: -0.5, marginTop: 2 }}>
            Your week
          </div>
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico name="search" size={18} /></button>
        <button style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.orange, boxShadow: `0 6px 14px ${c.orange}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico name="plus" size={20} color="#fff" /></button>
      </div>

      {/* Week strip */}
      <div style={{ padding: '16px 12px 0' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {days.map((d, i) => {
            const active = dayIdx === i;
            return (
              <button key={i} onClick={() => setDayIdx(i)} style={{
                flex: 1, padding: '10px 0', borderRadius: 14,
                background: active ? c.ink : c.card,
                color: active ? '#fff' : c.ink,
                border: `1px solid ${active ? c.ink : c.lineSoft}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                position: 'relative',
              }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, opacity: active ? 0.6 : 0.55, textTransform: 'uppercase' }}>
                  {d.d}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>{d.n}</div>
                {d.count > 0 ? (
                  <div style={{
                    display: 'flex', gap: 2, marginTop: 2,
                  }}>
                    {[...Array(Math.min(d.count, 3))].map((_, k) => (
                      <div key={k} style={{
                        width: 4, height: 4, borderRadius: 2,
                        background: active ? c.orange : c.orange,
                      }} />
                    ))}
                  </div>
                ) : <div style={{ height: 6 }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day headline */}
      <div style={{ padding: '18px 20px 6px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: c.ink, letterSpacing: -0.2 }}>
          Tuesday 21 Apr · <span style={{ color: c.orange }}>3 jobs</span>
        </div>
        <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>
          9:30 am → 3:45 pm · 3h 0m booked
        </div>
      </div>

      {/* Day grid */}
      <div style={{
        padding: '6px 8px 0 20px',
        position: 'relative',
      }}>
        <div style={{ position: 'relative', paddingLeft: 44 }}>
          {/* hour lines */}
          {[...Array(endH - startH + 1)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 12,
              top: i * hourH, height: 1,
              borderTop: `1px dashed ${c.lineSoft}`,
            }}>
              <div style={{
                position: 'absolute', left: -40, top: -8,
                fontSize: 10, fontWeight: 700, color: c.muted, width: 38, textAlign: 'right',
              }}>
                {startH + i}:00
              </div>
            </div>
          ))}

          {/* Now line */}
          <div style={{
            position: 'absolute', left: -44, right: 12,
            top: (10.5 - startH) * hourH,
            display: 'flex', alignItems: 'center',
          }}>
            <div style={{ width: 40, textAlign: 'right', paddingRight: 4, fontSize: 10, fontWeight: 800, color: c.orange }}>
              10:30
            </div>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.orange, marginRight: -4, zIndex: 2 }} />
            <div style={{ flex: 1, height: 2, background: c.orange, borderRadius: 999 }} />
          </div>

          {/* Events */}
          {events.map((e, i) => {
            const top = (e.start - startH) * hourH;
            const height = (e.end - e.start) * hourH;
            const tone = e.tone;
            const bg = tone === 'next' ? c.black : tone === 'quote' ? c.blueSoft : c.card;
            const fg = tone === 'next' ? '#fff' : tone === 'quote' ? c.blue : c.ink;
            const border = tone === 'next' ? 'transparent' : tone === 'quote' ? c.blueBorder : c.lineMid;
            return (
              <button key={i} onClick={() => Nav && Nav(tone === 'next' ? 'jobs-timer' : 'jobs-detail')} style={{
                position: 'absolute', left: 0, right: 12,
                top, height,
                background: bg, color: fg,
                border: `1px solid ${border}`,
                borderRadius: 12, padding: '8px 12px',
                textAlign: 'left', overflow: 'hidden',
                boxShadow: tone === 'next' ? `0 10px 20px rgba(0,0,0,0.12)` : '0 2px 6px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {tone === 'next' ? <Dot size={6} color={c.orange} pulse /> : null}
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase',
                    opacity: tone === 'next' ? 0.6 : 0.55,
                  }}>
                    {formatTime(e.start)} – {formatTime(e.end)}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2, marginTop: 1 }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 1 }}>{e.cust}</div>
              </button>
            );
          })}

          {/* bottom spacer */}
          <div style={{ height: (endH - startH + 1) * hourH }} />
        </div>
      </div>
    </Screen>
  );
}

function formatTime(v) {
  const h = Math.floor(v);
  const m = Math.round((v - h) * 60);
  const ampm = h >= 12 ? 'pm' : 'am';
  const hh = ((h + 11) % 12) + 1;
  return m === 0 ? `${hh}${ampm}` : `${hh}:${String(m).padStart(2, '0')}${ampm}`;
}

function __wrap(Comp) {
  return function Wrapped() {
    const dark = localStorage.getItem('vgn_proto_dark') === '1';
    return <ThemeProvider dark={dark}><Comp /></ThemeProvider>;
  };
}
Object.assign(window, { CalendarScreen: __wrap(_CalendarScreen) });
