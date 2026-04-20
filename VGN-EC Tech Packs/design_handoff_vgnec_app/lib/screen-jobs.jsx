// Jobs — list, detail, active timer, completion.

function _JobsList() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const [filter, setFilter] = React.useState('today');
  const jobs = [
    { id: 'J-91', title: 'Hot water swap', cust: 'Dalton',  addr: 'Rozelle',  t: 'Tue 9:30 am',  dur: '1h 45m', status: 'scheduled', tone: 'next', day: 'today' },
    { id: 'J-90', title: 'Leaking tap fix', cust: 'Chen',   addr: 'Glebe',    t: 'Tue 12:30 pm', dur: '30m',    status: 'scheduled', day: 'today' },
    { id: 'J-89', title: 'Reno site visit', cust: 'K Ng',   addr: 'Newtown',  t: 'Tue 3:00 pm',  dur: '45m',    status: 'scheduled', tone: 'quote', day: 'today' },
    { id: 'J-88', title: 'Switchboard check', cust: 'Pearson', addr: 'Mosman', t: 'Wed 8:00 am', dur: '2h',    status: 'scheduled', day: 'upcoming' },
    { id: 'J-87', title: 'Bathroom reno day 2', cust: 'K Ng', addr: 'Newtown', t: 'Mon · done',   dur: '6h',    status: 'completed', day: 'past' },
    { id: 'J-86', title: 'Downlights install', cust: 'Tanaka', addr: 'Balmain', t: 'Sat · done', dur: '3h',    status: 'completed', day: 'past' },
  ];
  const dayFilter = (j) => filter === 'all' ? true : j.day === filter;

  return (
    <Screen nav="calendar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 0' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Jobs</Eyebrow>
          <div style={{ fontSize: 22, fontWeight: 800, color: c.ink, letterSpacing: -0.5, marginTop: 2 }}>
            Your rounds
          </div>
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.orange, boxShadow: `0 6px 14px ${c.orange}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="plus" size={20} color="#fff" />
        </button>
      </div>

      {/* Big count */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          background: c.cream, border: `1px solid ${c.lineSoft}`,
          borderRadius: 22, padding: 18,
        }}>
          <Eyebrow>Today</Eyebrow>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4,
          }}>
            <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.4, color: c.ink, lineHeight: 1 }}>3</div>
            <div style={{ fontSize: 14, color: c.mutedHi, fontWeight: 700 }}>jobs · 3h 00m</div>
          </div>
          {/* mini rail of dots */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { t: '9:30', c: c.orange },
              { t: '12:30', c: c.ink },
              { t: '3:00', c: c.blue },
            ].map((j, i) => (
              <React.Fragment key={i}>
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: j.c, color: '#fff',
                  fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3,
                }}>{j.t}</div>
                {i < 2 ? <div style={{ flex: 1, height: 2, background: c.paperDeep, borderRadius: 999 }} /> : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '14px 20px 6px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }} className="no-scrollbar">
        {[
          { id: 'today',    l: 'Today' },
          { id: 'upcoming', l: 'Upcoming' },
          { id: 'past',     l: 'Past' },
          { id: 'all',      l: 'All' },
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              padding: '8px 14px', borderRadius: 999,
              background: active ? c.ink : c.card,
              color: active ? '#fff' : c.mutedHi,
              fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
              border: `1px solid ${active ? c.ink : c.lineSoft}`,
            }}>
              {t.l}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '6px 20px 0' }}>
        {jobs.filter(dayFilter).map((j, i) => (
          <button key={j.id} onClick={() => Nav && Nav(j.tone === 'next' ? 'jobs-timer' : 'jobs-detail')} style={{
            display: 'block', width: '100%', textAlign: 'left', marginBottom: 10,
          }}>
            <div style={{
              background: j.tone === 'next' ? c.black : c.card,
              color: j.tone === 'next' ? '#fff' : c.ink,
              border: j.tone === 'next' ? 'none' : `1px solid ${c.lineSoft}`,
              borderRadius: 18, padding: 16,
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: j.tone === 'next' ? `0 14px 28px rgba(0,0,0,0.15)` : '0 2px 6px rgba(0,0,0,0.03)',
              position: 'relative', overflow: 'hidden',
            }}>
              {j.tone === 'next' ? (
                <div style={{
                  position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                  background: `radial-gradient(circle, ${c.orange}88, transparent 70%)`,
                  opacity: 0.4, pointerEvents: 'none',
                }} />
              ) : null}
              <div style={{
                width: 56, flexShrink: 0, padding: '8px 0',
                textAlign: 'center', borderRight: `1px solid ${j.tone === 'next' ? 'rgba(255,255,255,0.12)' : c.lineSoft}`,
              }}>
                <div style={{
                  fontSize: 16, fontWeight: 800, letterSpacing: -0.3,
                  color: j.tone === 'next' ? '#fff' : c.ink,
                }}>{j.t.split(' ')[1] || j.t.split(' ')[0]}</div>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: 1,
                  color: j.tone === 'next' ? 'rgba(255,255,255,0.55)' : c.muted,
                  textTransform: 'uppercase', marginTop: 2,
                }}>{j.t.split(' ')[0]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingLeft: 4, position: 'relative' }}>
                {j.tone === 'next' ? (
                  <Eyebrow color="rgba(255,255,255,0.6)">Up next</Eyebrow>
                ) : null}
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, marginTop: j.tone === 'next' ? 2 : 0 }}>
                  {j.title}
                </div>
                <div style={{
                  fontSize: 11, color: j.tone === 'next' ? 'rgba(255,255,255,0.55)' : c.muted, marginTop: 2,
                }}>
                  {j.cust} · {j.addr} · {j.dur}
                </div>
                {j.status === 'completed' ? (
                  <div style={{ marginTop: 6 }}>
                    <StatusPill tone="paid">Completed</StatusPill>
                  </div>
                ) : j.tone === 'quote' ? (
                  <div style={{ marginTop: 6 }}>
                    <StatusPill tone="active">✦ Quote visit</StatusPill>
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </Screen>
  );
}

// ═══ Job detail ═════════════════════════════════════════════════
function _JobDetail() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <Screen nav="calendar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '56px 20px 0' }}>
        <button onClick={() => Nav && Nav('jobs-list')} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="back" size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <Eyebrow>Job · J-91</Eyebrow>
          <div style={{ fontSize: 18, fontWeight: 800, color: c.ink, letterSpacing: -0.4 }}>Hot water swap</div>
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Ico name="more" size={18} /></button>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        {/* Map placeholder */}
        <div style={{
          height: 150, borderRadius: 22, overflow: 'hidden',
          background: `linear-gradient(135deg, #dce6e9, #e9efe9)`,
          position: 'relative',
          border: `1px solid ${c.lineSoft}`,
        }}>
          {/* Fake map shapes */}
          <svg width="100%" height="100%" viewBox="0 0 400 150" style={{ position: 'absolute', inset: 0 }}>
            <path d="M0 80 Q 100 60, 200 90 T 400 100" stroke="#b4c4c8" strokeWidth="28" fill="none" />
            <path d="M0 80 Q 100 60, 200 90 T 400 100" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="8 6" />
            <circle cx="60" cy="95" r="10" fill="#f26a2a" />
            <circle cx="60" cy="95" r="10" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M330 60 L340 90 L350 60 Z" fill={c.ink} />
          </svg>
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            padding: '6px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            fontSize: 11, fontWeight: 800, color: c.ink,
          }}>12 min · 6.2 km</div>
          <div style={{
            position: 'absolute', top: 10, left: 10,
            padding: '4px 10px', borderRadius: 999,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            fontSize: 10, fontWeight: 800, color: c.muted, letterSpacing: 1.2, textTransform: 'uppercase',
          }}>[map placeholder]</div>
        </div>

        {/* Schedule */}
        <Card style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: c.orangeSoft, color: c.orangeDeep,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1 }}>TUE</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1 }}>21</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: c.ink }}>9:30 – 11:15 am</div>
            <div style={{ fontSize: 11, color: c.muted, marginTop: 2 }}>1h 45m estimated</div>
          </div>
          <button style={{
            padding: '8px 14px', borderRadius: 10, background: c.paperDeep,
            fontSize: 12, fontWeight: 800, color: c.ink,
          }}>Reschedule</button>
        </Card>

        {/* Customer */}
        <Card style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: c.ink,
            color: c.orange, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800,
          }}>JD</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Jack Dalton</div>
            <div style={{ fontSize: 11, color: c.muted, marginTop: 1 }}>42 Harbour St, Rozelle</div>
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

        {/* Notes */}
        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Job notes</Eyebrow>
        <Card style={{ fontSize: 13, color: c.mutedHi, lineHeight: 1.5 }}>
          Back gate code is <b style={{ color: c.ink }}>4821#</b>. Old HWU in the garage — Jack can help
          shift it to kerb. Bring expansion valve + teflon tape.
        </Card>

        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Parts & photos</Eyebrow>
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              flex: 1, aspectRatio: '1', borderRadius: 12,
              background: c.paperDeep, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px dashed ${c.lineMid}`,
            }}>
              <Ico name="camera" size={20} color={c.muted} />
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
        display: 'flex', gap: 8,
      }}>
        <button style={{
          flex: 1, height: 54, borderRadius: 18,
          background: c.card, border: `1px solid ${c.lineMid}`,
          fontSize: 13, fontWeight: 800, color: c.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}><Ico name="pin" size={15} /> Navigate</button>
        <button onClick={() => Nav && Nav('jobs-timer')} style={{
          flex: 2, height: 54, borderRadius: 18,
          background: c.orange, color: '#fff',
          fontSize: 15, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 10px 24px ${c.orange}66`,
        }}><Ico name="play" size={14} color="#fff" /> Start job</button>
      </div>
    </Screen>
  );
}

// ═══ Active timer ══════════════════════════════════════════════
function _JobTimer() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  const [sec, setSec] = React.useState(2732); // 45:32
  React.useEffect(() => {
    const t = setInterval(() => setSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <Screen nav="calendar">
      {/* Dark ambient hero */}
      <div style={{
        background: c.black, color: '#fff', paddingTop: 56, paddingBottom: 30,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 260, height: 260,
          background: `radial-gradient(circle, ${c.orange}88, transparent 70%)`,
          opacity: 0.5, pointerEvents: 'none',
          /* [anim: pulse scale 1 -> 1.05 infinite 3s] */
        }} />

        <div style={{ padding: '0 20px 0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => Nav && Nav('jobs-detail')} style={{
              width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Ico name="back" size={18} color="#fff" /></button>
            <div style={{ flex: 1 }}>
              <Eyebrow color="rgba(255,255,255,0.6)">On the job</Eyebrow>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>Hot water swap · Dalton</div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 999,
              background: c.orange,
              fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
            }}>
              <Dot size={6} color="#fff" pulse /> Live
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '24px 0 14px' }}>
            <Eyebrow color="rgba(255,255,255,0.5)">Elapsed</Eyebrow>
            <div style={{
              fontSize: 72, fontWeight: 800, letterSpacing: -3, lineHeight: 0.9,
              marginTop: 8, color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {pad(h)}:{pad(m)}<span style={{ color: 'rgba(255,255,255,0.3)' }}>:{pad(s)}</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 10 }}>
              Estimated 1h 45m · on pace
            </div>
          </div>

          {/* Progress ring placeholder / bar */}
          <div style={{
            height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden', margin: '0 40px',
          }}>
            <div style={{
              width: `${(sec / 6300) * 100}%`, height: '100%',
              background: `linear-gradient(90deg, ${c.orange}, ${c.orangeDeep})`,
              /* [anim: width transitions smoothly] */
            }} />
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 14, marginTop: 28,
          }}>
            <button style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Ico name="pause" size={22} color="#fff" /></button>
            <button style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Ico name="camera" size={22} color="#fff" /></button>
            <button style={{
              width: 58, height: 58, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Ico name="plus" size={22} color="#fff" /></button>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div style={{ padding: '22px 20px 0' }}>
        <Eyebrow>Checklist · 3 of 5</Eyebrow>
        <div style={{ marginTop: 10 }}>
          {[
            ['Isolate water + power', true],
            ['Drain old unit', true],
            ['Mount new HWU', true],
            ['Install expansion valve', false],
            ['Pressure test + commission', false],
          ].map(([t, done], i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: c.card,
              border: `1px solid ${c.lineSoft}`,
              borderRadius: 12, marginBottom: 6,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: done ? c.green : 'transparent',
                border: done ? 'none' : `2px solid ${c.lineMid}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {done ? <Ico name="check" size={12} color="#fff" /> : null}
              </div>
              <div style={{
                flex: 1, fontSize: 13, fontWeight: 700,
                color: done ? c.muted : c.ink,
                textDecoration: done ? 'line-through' : 'none',
              }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
      }}>
        <button onClick={() => Nav && Nav('jobs-complete')} style={{
          width: '100%', height: 58, borderRadius: 22,
          background: c.orange, color: '#fff',
          fontSize: 16, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 14px 30px ${c.orange}66`,
        }}>
          <Ico name="check" size={18} color="#fff" /> Mark complete
        </button>
      </div>
    </Screen>
  );
}

// ═══ Job completion ════════════════════════════════════════════
function _JobCompletion() {
  const { c } = useTheme();
  const Nav = window.__vgnNav;
  return (
    <Screen nav="calendar">
      <div style={{ padding: '56px 20px 0' }}>
        <button onClick={() => Nav && Nav('jobs-timer')} style={{
          width: 40, height: 40, borderRadius: 12,
          background: c.card, border: `1px solid ${c.lineSoft}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico name="back" size={18} />
        </button>
      </div>

      <div style={{ padding: '20px 20px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 88, height: 88, borderRadius: '50%',
          background: c.greenSoft, color: c.green,
          marginBottom: 18,
          /* [anim: scale 0 -> 1.1 -> 1, spring] */
        }}>
          <Ico name="check" size={40} color={c.green} />
        </div>
        <Eyebrow>Job complete</Eyebrow>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: c.ink, marginTop: 4, lineHeight: 1.1 }}>
          Hot water swap<br/>
          <span style={{ color: c.orange }}>wrapped.</span>
        </div>
        <div style={{ fontSize: 13, color: c.mutedHi, marginTop: 8 }}>
          1h 52m · 7 minutes over estimate
        </div>
      </div>

      <div style={{ padding: '22px 20px 0' }}>
        <Card pad={0}>
          {[
            ['Duration',   '1h 52m'],
            ['Quote total','$2,004'],
            ['Actuals',    '$1,980 (-$24 parts)'],
            ['Photos',     '4 attached'],
          ].map(([l, v], i) => (
            <div key={l} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '14px 16px',
              borderTop: i === 0 ? 'none' : `1px solid ${c.lineSoft}`,
              fontSize: 13,
            }}>
              <span style={{ color: c.muted, fontWeight: 600 }}>{l}</span>
              <span style={{ color: c.ink, fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </Card>

        <Eyebrow style={{ marginTop: 22, marginBottom: 8 }}>Next step</Eyebrow>
        <Card style={{
          background: `linear-gradient(135deg, ${c.orange}, ${c.orangeDeep})`,
          color: '#fff', border: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Ico name="sparkle" size={20} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.85 }}>
                Suggested
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, marginTop: 2 }}>
                Generate invoice from this job
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{
        position: 'absolute', bottom: 100, left: 12, right: 12, zIndex: 30,
        display: 'flex', gap: 8,
      }}>
        <button onClick={() => Nav && Nav('home')} style={{
          flex: 1, height: 54, borderRadius: 18,
          background: c.card, border: `1px solid ${c.lineMid}`,
          fontSize: 13, fontWeight: 800, color: c.ink,
        }}>Finish</button>
        <button onClick={() => Nav && Nav('invoices-create')} style={{
          flex: 2, height: 54, borderRadius: 18,
          background: c.orange, color: '#fff',
          fontSize: 15, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 10px 24px ${c.orange}66`,
        }}>Make invoice <Arrow size={16} color="#fff" /></button>
      </div>
    </Screen>
  );
}

function __wrap(Comp) {
  return function Wrapped() {
    const dark = localStorage.getItem('vgn_proto_dark') === '1';
    return <ThemeProvider dark={dark}><Comp /></ThemeProvider>;
  };
}
Object.assign(window, {
  JobsList:      __wrap(_JobsList),
  JobDetail:     __wrap(_JobDetail),
  JobTimer:      __wrap(_JobTimer),
  JobCompletion: __wrap(_JobCompletion),
});
