'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Lane = 'work' | 'music' | 'money'
type Tab  = Lane | 'chat'
type CalView = 'day' | 'week' | 'month'
type MType = 'income' | 'expense'

interface CalEvent {
  id: string
  title: string
  date: string       // YYYY-MM-DD
  time: string | null
  note: string | null
  amount: string | null
  mtype: MType | null
}

interface ChatMsg {
  role: 'user' | 'ai'
  text: string
  calMsg?: string
}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function pad(n: number) { return String(n).padStart(2, '0') }
function localDs(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function parseDs(s: string) { const p = s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]) }
function todayStr() { return localDs(new Date()) }
function nowTime() { return new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }) }

// ─── ICS EXPORT ───────────────────────────────────────────────────────────────
function exportIcs(ev: CalEvent, lane: Lane) {
  const laneNames: Record<Lane,string> = { work:'Work - Don', music:'Music - Don', money:'Money - Don' }
  const d = ev.date.replace(/-/g,'')
  let dts: string, dte: string
  if (ev.time) {
    const t = ev.time.replace(':','') + '00'
    dts = `${d}T${t}`
    const [h,m] = ev.time.split(':')
    dte = `${d}T${pad((parseInt(h)+1)%24)}${m}00`
  } else { dts = d; dte = d }
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',
    `SUMMARY:${ev.title}`,
    `DTSTART${ev.time ? '' : ';VALUE=DATE'}:${dts}`,
    `DTEND${ev.time ? '' : ';VALUE=DATE'}:${dte}`,
    `DESCRIPTION:${ev.note || "Don's Command Center"}`,
    `CATEGORIES:${laneNames[lane]}`,
    'END:VEVENT','END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = ev.title.replace(/\W+/g,'_') + '.ics'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// ─── ACCENT COLORS ────────────────────────────────────────────────────────────
const ACCENT: Record<Tab,string> = {
  work:  '#c8f04a',
  music: '#4af0c8',
  money: '#f0a84a',
  chat:  '#c084fc',
}
const ACCENT_BG: Record<Tab,string> = {
  work:  'rgba(200,240,74,.1)',
  music: 'rgba(74,240,200,.1)',
  money: 'rgba(240,168,74,.1)',
  chat:  'rgba(192,132,252,.1)',
}

// ─── COMPONENT HELPERS ────────────────────────────────────────────────────────
function SLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:9, fontWeight:600, letterSpacing:'2px', textTransform:'uppercase', color:'var(--muted)', marginBottom:10 }}>{children}</div>
}

function AddBtn({ lane, onClick }: { lane: Lane, onClick: () => void }) {
  const labels: Record<Lane,string> = { work:'Add task or event', music:'Add task or deadline', money:'Add income or expense' }
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:8, width:'100%',
      background:'var(--s2)', border:'1px dashed var(--border)', borderRadius:10,
      padding:'11px 14px', fontSize:12, color:'var(--muted)', cursor:'pointer',
      fontFamily:'DM Mono, monospace', marginTop:4,
    }}>
      <span style={{ fontSize:16 }}>+</span> {labels[lane]}
    </button>
  )
}

function EventItem({ ev, lane, onDel }: { ev: CalEvent, lane: Lane, onDel: () => void }) {
  return (
    <div className="anim-fade-in" style={{
      display:'flex', alignItems:'center', gap:10,
      background:'var(--s1)', border:'1px solid var(--border)',
      borderRadius:10, padding:'10px 12px', marginBottom:6,
    }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:ACCENT[lane], flexShrink:0 }} />
      <span style={{ fontSize:10, color:'var(--muted)', minWidth:34 }}>{ev.time || '——'}</span>
      <span style={{ flex:1, fontSize:12, lineHeight:1.4 }}>
        {ev.title}
        {ev.note && <><br /><span style={{ fontSize:10, color:'var(--muted)' }}>{ev.note}</span></>}
      </span>
      <button onClick={onDel} style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
    </div>
  )
}

// ─── DAY VIEW ─────────────────────────────────────────────────────────────────
function DayView({ lane, events, onDel }: { lane: Lane, events: CalEvent[], onDel: (id:string)=>void }) {
  const today = todayStr()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return localDs(d)
  })
  return (
    <div>
      {days.map((ds, i) => {
        const dayEvs = events.filter(e => e.date === ds)
        const d = parseDs(ds)
        const lbl = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
        return (
          <div key={ds}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color: i===0 ? 'var(--text)' : 'var(--muted)', padding:'10px 0 4px', borderBottom:'1px solid var(--border)', marginBottom:6 }}>{lbl}</div>
            {dayEvs.length === 0
              ? <div style={{ fontSize:11, color:'var(--muted)', padding:'2px 0 10px', opacity:.6 }}>No events</div>
              : dayEvs.map(ev => <EventItem key={ev.id} ev={ev} lane={lane} onDel={() => onDel(ev.id)} />)
            }
          </div>
        )
      })}
    </div>
  )
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({ lane, events, onDel }: { lane: Lane, events: CalEvent[], onDel: (id:string)=>void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const ws = new Date(today); ws.setDate(today.getDate() - today.getDay())
  const [sel, setSel] = useState(todayStr())
  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws); d.setDate(ws.getDate() + i); return localDs(d)
  })
  const selEvs = events.filter(e => e.date === sel)
  const selD   = parseDs(sel)
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:12 }}>
        {week.map((ds, i) => {
          const evs = events.filter(e => e.date === ds)
          const isT = ds === todayStr(), isSel = ds === sel
          return (
            <div key={ds} onClick={() => setSel(ds)} style={{
              background: isSel ? 'var(--s2)' : 'var(--s1)',
              border: `1px solid ${isT ? ACCENT[lane] : isSel ? 'var(--dim)' : 'var(--border)'}`,
              borderRadius:8, padding:'6px 3px', minHeight:64, cursor:'pointer', textAlign:'center',
            }}>
              <div style={{ fontSize:8, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px' }}>{dayNames[i]}</div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, margin:'2px 0 3px', color: isT ? ACCENT[lane] : 'var(--text)' }}>{parseDs(ds).getDate()}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:2, justifyContent:'center' }}>
                {evs.slice(0,4).map((_,j) => <div key={j} style={{ width:5, height:5, borderRadius:'50%', background:ACCENT[lane] }} />)}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>
        {selD.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
      </div>
      {selEvs.length === 0
        ? <div style={{ fontSize:11, color:'var(--muted)', opacity:.6 }}>No events this day</div>
        : selEvs.map(ev => <EventItem key={ev.id} ev={ev} lane={lane} onDel={() => onDel(ev.id)} />)
      }
    </div>
  )
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────
function MonthView({ lane, events, onDel }: { lane: Lane, events: CalEvent[], onDel: (id:string)=>void }) {
  const now = new Date()
  const [viewM, setViewM] = useState(now.getMonth())
  const [viewY, setViewY] = useState(now.getFullYear())
  const [sel, setSel]     = useState<string|null>(null)

  const first = new Date(viewY, viewM, 1).getDay()
  const dim   = new Date(viewY, viewM+1, 0).getDate()
  const mName = new Date(viewY, viewM, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' })
  const today = todayStr()

  const nav = (dir: number) => {
    let m = viewM + dir, y = viewY
    if (m > 11) { m = 0; y++ } else if (m < 0) { m = 11; y-- }
    setViewM(m); setViewY(y); setSel(null)
  }

  const selEvs = sel ? events.filter(e => e.date === sel) : []

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button onClick={() => nav(-1)} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text)', width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:800 }}>{mName}</div>
        <button onClick={() => nav(1)}  style={{ background:'none', border:'1px solid var(--border)', color:'var(--text)', width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:14 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ fontSize:9, color:'var(--muted)', textAlign:'center', padding:'3px 0', letterSpacing:'.4px' }}>{d}</div>
        ))}
        {Array.from({ length: first }, (_, i) => <div key={'e'+i} />)}
        {Array.from({ length: dim }, (_, i) => {
          const d = i + 1
          const ds = `${viewY}-${pad(viewM+1)}-${pad(d)}`
          const evs = events.filter(e => e.date === ds)
          const isT = ds === today, isSel = ds === sel
          return (
            <div key={ds} onClick={() => setSel(isSel ? null : ds)} style={{
              display:'flex', flexDirection:'column', alignItems:'center',
              padding:'4px 2px', borderRadius:8, cursor:'pointer', minHeight:36,
              background: isSel ? 'var(--s2)' : isT ? ACCENT_BG[lane] : 'transparent',
              border: `1px solid ${isSel ? 'var(--dim)' : isT ? ACCENT[lane] : 'transparent'}`,
            }}>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:11, fontWeight:700, color: isT ? ACCENT[lane] : 'var(--text)' }}>{d}</div>
              <div style={{ display:'flex', gap:2, flexWrap:'wrap', justifyContent:'center', marginTop:2 }}>
                {evs.slice(0,3).map((_,j) => <div key={j} style={{ width:4, height:4, borderRadius:'50%', background:ACCENT[lane] }} />)}
              </div>
            </div>
          )
        })}
      </div>
      {sel && (
        <div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>
            {parseDs(sel).toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
          </div>
          {selEvs.length === 0
            ? <div style={{ fontSize:11, color:'var(--muted)', opacity:.6 }}>No events this day</div>
            : selEvs.map(ev => <EventItem key={ev.id} ev={ev} lane={lane} onDel={() => onDel(ev.id)} />)
          }
        </div>
      )}
    </div>
  )
}

// ─── WORK / MUSIC PAGE ────────────────────────────────────────────────────────
function CalPage({ lane, events, onAdd, onDel }: {
  lane: 'work' | 'music'
  events: CalEvent[]
  onAdd: () => void
  onDel: (id: string) => void
}) {
  const [view, setView] = useState<CalView>('day')
  const labels: Record<Lane,string> = { work:'Work Calendar', music:'Music Calendar', money:'' }

  return (
    <div style={{ padding:'18px 18px 80px', overflowY:'auto', flex:1 }} className="no-scroll">
      <SLabel>{labels[lane]}</SLabel>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {(['day','week','month'] as CalView[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            fontSize:10, fontFamily:'Syne,sans-serif', fontWeight:700, letterSpacing:'.5px',
            textTransform:'uppercase', padding:'5px 14px', borderRadius:20,
            border: `1px solid ${view===v ? ACCENT[lane] : 'var(--border)'}`,
            background: view===v ? ACCENT_BG[lane] : 'none',
            color: view===v ? ACCENT[lane] : 'var(--muted)', cursor:'pointer',
          }}>{v}</button>
        ))}
      </div>
      {view === 'day'   && <DayView   lane={lane} events={events} onDel={onDel} />}
      {view === 'week'  && <WeekView  lane={lane} events={events} onDel={onDel} />}
      {view === 'month' && <MonthView lane={lane} events={events} onDel={onDel} />}
      <AddBtn lane={lane} onClick={onAdd} />
    </div>
  )
}

// ─── MONEY PAGE ───────────────────────────────────────────────────────────────
function MoneyPage({ events, onAdd, onDel }: { events: CalEvent[], onAdd: () => void, onDel: (id:string)=>void }) {
  const now = new Date()
  const [viewM, setViewM] = useState(now.getMonth())
  const [viewY, setViewY] = useState(now.getFullYear())
  const [sel, setSel]     = useState<string|null>(null)

  const monthEvs = events.filter(e => {
    const d = parseDs(e.date); return d.getMonth() === viewM && d.getFullYear() === viewY
  })
  const inc = monthEvs.filter(e=>e.mtype==='income').reduce((s,e)=>s+parseFloat(e.amount||'0'),0)
  const exp = monthEvs.filter(e=>e.mtype==='expense').reduce((s,e)=>s+parseFloat(e.amount||'0'),0)
  const net = inc - exp

  const first = new Date(viewY, viewM, 1).getDay()
  const dim   = new Date(viewY, viewM+1, 0).getDate()
  const mName = new Date(viewY, viewM, 1).toLocaleDateString('en-US', { month:'long', year:'numeric' })
  const today = todayStr()

  const nav = (dir: number) => {
    let m = viewM+dir, y = viewY
    if (m>11){m=0;y++} else if(m<0){m=11;y--}
    setViewM(m);setViewY(y);setSel(null)
  }

  const selEvs = sel ? events.filter(e=>e.date===sel) : []

  return (
    <div style={{ padding:'18px 18px 80px', overflowY:'auto', flex:1 }} className="no-scroll">
      <SLabel>Money Calendar</SLabel>

      {/* Balance Bar */}
      <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:14, padding:14, marginBottom:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, textAlign:'center' }}>
        {[
          { label:'Income',   val:`$${inc.toLocaleString()}`,  color:'var(--work)' },
          { label:'Expenses', val:`$${exp.toLocaleString()}`,  color:'var(--danger)' },
          { label:'Net',      val:`${net>=0?'+':''}$${Math.abs(net).toLocaleString()}`, color: net>=0?'var(--work)':'var(--danger)' },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Month nav */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <button onClick={()=>nav(-1)} style={{ background:'none', border:'1px solid var(--border)', color:'var(--text)', width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:800 }}>{mName}</div>
        <button onClick={()=>nav(1)}  style={{ background:'none', border:'1px solid var(--border)', color:'var(--text)', width:28, height:28, borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      </div>

      {/* Calendar Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:14 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(
          <div key={d} style={{ fontSize:9, color:'var(--muted)', textAlign:'center', padding:'3px 0', letterSpacing:'.4px' }}>{d}</div>
        ))}
        {Array.from({length:first},(_,i)=><div key={'e'+i}/>)}
        {Array.from({length:dim},(_,i)=>{
          const d=i+1
          const ds=`${viewY}-${pad(viewM+1)}-${pad(d)}`
          const dayEvs=events.filter(e=>e.date===ds)
          const hasI=dayEvs.some(e=>e.mtype==='income')
          const hasE=dayEvs.some(e=>e.mtype==='expense')
          const isT=ds===today, isSel=ds===sel
          return (
            <div key={ds} onClick={()=>setSel(isSel?null:ds)} style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              padding:'4px 2px',borderRadius:8,cursor:'pointer',minHeight:36,
              background:isSel?'var(--s2)':isT?'rgba(240,168,74,.08)':'transparent',
              border:`1px solid ${isSel?'var(--dim)':isT?'var(--money)':'transparent'}`,
            }}>
              <div style={{ fontFamily:'Syne,sans-serif',fontSize:11,fontWeight:700,color:isT?'var(--money)':'var(--text)' }}>{d}</div>
              <div style={{ display:'flex',gap:2,marginTop:2 }}>
                {hasI&&<div style={{width:4,height:4,borderRadius:'50%',background:'var(--work)'}}/>}
                {hasE&&<div style={{width:4,height:4,borderRadius:'50%',background:'var(--danger)'}}/>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected day detail */}
      {sel && selEvs.length > 0 && (
        <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:12, padding:13, marginBottom:14 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, marginBottom:10, color:'var(--muted)' }}>
            {parseDs(sel).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
          </div>
          {selEvs.map(ev => (
            <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ flex:1, fontSize:12 }}>{ev.title}</span>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color: ev.mtype==='income'?'var(--work)':'var(--danger)' }}>
                {ev.mtype==='income'?'+':'-'}${parseFloat(ev.amount||'0').toLocaleString()}
              </span>
              <button onClick={()=>onDel(ev.id)} style={{ background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:16,padding:'0 4px' }}>×</button>
            </div>
          ))}
        </div>
      )}

      <AddBtn lane="money" onClick={onAdd} />
    </div>
  )
}

// ─── CHAT PAGE ────────────────────────────────────────────────────────────────
function ChatPage({ onAddEvent, onDelEvent }: {
  onAddEvent: (lane: Lane, ev: CalEvent) => void
  onDelEvent: (lane: Lane, title: string) => void
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: 'ai',
    text: "Hey Don 👋 I'm your AI financial advisor. I can add or delete tasks on your Work, Music, or Money calendars — and push them to Apple Calendar too.\n\nTry: \"Add prospect Delta Airlines to work on March 20\" or \"Log rent $850 expense on April 1\"",
  }])
  const [input, setInput] = useState('')
  const [busy, setBusy]   = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const chips   = ['✈️ Prospect airline','🎵 Music deadline','💰 Log payday $1400','🏠 Rent $850','📊 Savings check-in']

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [msgs])

  async function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg || busy) return
    setBusy(true); setInput('')
    setMsgs(m => [...m, { role:'user', text:msg }])

    try {
      const res  = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message:msg, today:todayStr() }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const full: string = data.text
      const addM = full.match(/ADD:(\{[^}]+\})/)
      const delM = full.match(/DEL:(\{[^}]+\})/)
      let calMsg: string | undefined
      let display = full.replace(/ADD:\{[^}]+\}/,'').replace(/DEL:\{[^}]+\}/,'').trim()

      if (addM) {
        try {
          const ev = JSON.parse(addM[1])
          const newEv: CalEvent = { id:'e'+Date.now(), title:ev.title, date:ev.date||todayStr(), time:ev.time||null, note:ev.note||null, amount:ev.amount||null, mtype:ev.mtype||null }
          const lane = (ev.lane || 'work') as Lane
          onAddEvent(lane, newEv)
          exportIcs(newEv, lane)
          calMsg = `"${ev.title}" added to ${lane} + Apple Calendar ↓`
        } catch {}
      }
      if (delM) {
        try {
          const d    = JSON.parse(delM[1])
          const lane = (d.lane || 'work') as Lane
          onDelEvent(lane, d.title)
          calMsg = `Removed from ${lane} calendar`
        } catch {}
      }

      setMsgs(m => [...m, { role:'ai', text: display || 'Done! Your calendar is updated.', calMsg }])
    } catch {
      setMsgs(m => [...m, { role:'ai', text:'Connection issue — make sure ANTHROPIC_API_KEY is set in your .env.local file.' }])
    }
    setBusy(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', position:'absolute', inset:0 }}>
      {/* Messages */}
      <div ref={msgsRef} className="no-scroll" style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
        {msgs.map((m, i) => (
          <div key={i} className="anim-fade-in" style={{ display:'flex', flexDirection:'column', alignItems: m.role==='user'?'flex-end':'flex-start', gap:3 }}>
            <div style={{
              maxWidth:'87%', padding:'10px 13px', fontSize:13, lineHeight:1.55, borderRadius:14,
              background: m.role==='user' ? ACCENT.chat : 'var(--s2)',
              color: m.role==='user' ? '#000' : 'var(--text)',
              fontWeight: m.role==='user' ? 500 : 400,
              border: m.role==='ai' ? '1px solid var(--border)' : 'none',
              borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
            }}>{m.text.split('\n').map((l,j)=><span key={j}>{l}{j<m.text.split('\n').length-1&&<br/>}</span>)}</div>
            {m.calMsg && (
              <div style={{ maxWidth:'87%', background:'rgba(200,240,74,.07)', border:'1px solid rgba(200,240,74,.2)', borderRadius:9, padding:'7px 12px', fontSize:12, color:'var(--work)', display:'flex', alignItems:'center', gap:7 }}>
                📅 {m.calMsg}
              </div>
            )}
            <span style={{ fontSize:10, color:'var(--muted)', padding:'0 2px' }}>{nowTime()}</span>
          </div>
        ))}
        {busy && (
          <div style={{ display:'flex', alignItems:'flex-start' }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'10px 14px', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:'14px 14px 14px 4px' }}>
              {[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:'50%',background:'var(--muted)' }} className={`dot-bounce${i>0?`-${i+1}`:''}`}/>)}
            </div>
          </div>
        )}
      </div>

      {/* Chips */}
      <div style={{ padding:'9px 13px', display:'flex', gap:6, flexWrap:'wrap', borderTop:'1px solid var(--border)', background:'var(--s1)', flexShrink:0 }}>
        {chips.map(c => (
          <button key={c} onClick={() => send(c.slice(2).trim())} style={{
            fontSize:11, padding:'5px 10px', borderRadius:20, background:'var(--s2)',
            border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer',
            fontFamily:'DM Mono, monospace', whiteSpace:'nowrap',
          }}>{c}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:9, padding:'11px 13px', borderTop:'1px solid var(--border)', background:'var(--s1)', flexShrink:0, alignItems:'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()} }}
          placeholder="Tell me what to schedule..."
          rows={1}
          style={{
            flex:1, background:'var(--s2)', border:'1px solid var(--border)', borderRadius:11,
            padding:'10px 12px', fontFamily:'DM Mono, monospace', fontSize:13, color:'var(--text)',
            resize:'none', outline:'none', minHeight:42, maxHeight:100, lineHeight:1.4,
          }}
        />
        <button onClick={() => send()} disabled={busy} style={{
          width:42, height:42, flexShrink:0, borderRadius:11, background:ACCENT.chat,
          border:'none', cursor:'pointer', fontSize:20, color:'#000', fontWeight:700,
          opacity: busy ? .35 : 1,
        }}>↑</button>
      </div>
    </div>
  )
}

// ─── ADD MODAL ────────────────────────────────────────────────────────────────
function AddModal({ lane, onClose, onAdd }: { lane: Lane, onClose: () => void, onAdd: (ev: CalEvent) => void }) {
  const [name, setName]   = useState('')
  const [date, setDate]   = useState(todayStr())
  const [time, setTime]   = useState('')
  const [note, setNote]   = useState('')
  const [mtype, setMtype] = useState<MType>('expense')
  const labels: Record<Lane,string> = { work:'Add Work Event', music:'Add Music Task', money:'Add Income / Expense' }

  function confirm() {
    if (!name.trim() || !date) return
    const amtM = note.match(/[\d,]+(\.\d+)?/)
    const ev: CalEvent = {
      id: 'e' + Date.now(), title: name.trim(), date, time: time || null, note: note || null,
      amount: lane === 'money' && amtM ? amtM[0].replace(/,/g,'') : null,
      mtype:  lane === 'money' ? mtype : null,
    }
    onAdd(ev)
    exportIcs(ev, lane)
    onClose()
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:300, backdropFilter:'blur(6px)' }}>
      <div className="anim-slide-up" style={{ background:'var(--s1)', border:'1px solid var(--border)', borderTop:'none', borderRadius:'20px 20px 0 0', padding:'20px 18px', width:'100%', maxWidth:680 }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, marginBottom:14 }}>{labels[lane]}</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Title" style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 13px', fontFamily:'DM Mono,monospace', fontSize:14, color:'var(--text)', outline:'none', marginBottom:9 }} />
        <div style={{ display:'flex', gap:9 }}>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ flex:1, background:'var(--s2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 13px', fontFamily:'DM Mono,monospace', fontSize:14, color:'var(--text)', outline:'none', marginBottom:9 }} />
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ flex:1, background:'var(--s2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 13px', fontFamily:'DM Mono,monospace', fontSize:14, color:'var(--text)', outline:'none', marginBottom:9 }} />
        </div>
        {lane === 'money' ? (
          <>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Amount (e.g. 1400)" style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 13px', fontFamily:'DM Mono,monospace', fontSize:14, color:'var(--text)', outline:'none', marginBottom:9 }} />
            <div style={{ display:'flex', gap:9, marginBottom:9 }}>
              {(['income','expense'] as MType[]).map(t => (
                <button key={t} onClick={()=>setMtype(t)} style={{
                  flex:1, padding:10, borderRadius:10, border:`1px solid ${mtype===t?ACCENT.money:'var(--border)'}`,
                  background: mtype===t ? ACCENT_BG.money : 'none',
                  color: mtype===t ? ACCENT.money : 'var(--muted)',
                  fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer', textTransform:'capitalize',
                }}>{t}</button>
              ))}
            </div>
          </>
        ) : (
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)" style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 13px', fontFamily:'DM Mono,monospace', fontSize:14, color:'var(--text)', outline:'none', marginBottom:9 }} />
        )}
        <div style={{ display:'flex', gap:9, marginTop:2 }}>
          <button onClick={onClose} style={{ flex:1, padding:12, borderRadius:10, border:'none', background:'var(--s3)', color:'var(--muted)', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
          <button onClick={confirm} style={{ flex:1, padding:12, borderRadius:10, border:'none', background:ACCENT[lane], color:'#000', fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer' }}>Add</button>
        </div>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState<Tab>('work')
  const [modal, setModal]     = useState<Lane|null>(null)
  const [events, setEvents]   = useState<Record<Lane, CalEvent[]>>({ work:[], music:[], money:[] })

  const addEvent = useCallback((lane: Lane, ev: CalEvent) => {
    setEvents(prev => ({ ...prev, [lane]: [...prev[lane], ev] }))
  }, [])
  const delEvent = useCallback((lane: Lane, id: string) => {
    setEvents(prev => ({ ...prev, [lane]: prev[lane].filter(e => e.id !== id) }))
  }, [])
  const delByTitle = useCallback((lane: Lane, title: string) => {
    const q = title.toLowerCase()
    setEvents(prev => ({ ...prev, [lane]: prev[lane].filter(e => !e.title.toLowerCase().includes(q)) }))
  }, [])

  const tabs: { id: Tab, icon: string, label: string }[] = [
    { id:'work',  icon:'💼', label:'WORK'    },
    { id:'music', icon:'🎵', label:'MUSIC'   },
    { id:'money', icon:'💰', label:'MONEY'   },
    { id:'chat',  icon:'🤖', label:'ADVISOR' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', height:'100dvh' as any, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ flexShrink:0, padding:'12px 18px', background:'rgba(8,8,16,.97)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', backdropFilter:'blur(16px)' }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:800, letterSpacing:'-.3px' }}>
          DON'S <em style={{ fontStyle:'normal', color:ACCENT[tab] }}>COMMAND CENTER</em>
        </div>
        <div style={{ fontSize:10, color:'var(--muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ flexShrink:0, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', background:'var(--s1)', borderBottom:'1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'9px 4px', textAlign:'center', cursor:'pointer',
            fontSize:9, fontFamily:'Syne,sans-serif', fontWeight:700, letterSpacing:'.5px', textTransform:'uppercase',
            color: tab===t.id ? ACCENT[t.id] : 'var(--muted)',
            borderBottom: `2px solid ${tab===t.id ? ACCENT[t.id] : 'transparent'}`,
            background:'none', border:'none', borderBottom: `2px solid ${tab===t.id ? ACCENT[t.id] : 'transparent'}` as any,
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            transition:'all .2s',
          }}>
            <span style={{ fontSize:15 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Pages */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        {tab === 'work'  && <CalPage  lane="work"  events={events.work}  onAdd={()=>setModal('work')}  onDel={id=>delEvent('work',id)}  />}
        {tab === 'music' && <CalPage  lane="music" events={events.music} onAdd={()=>setModal('music')} onDel={id=>delEvent('music',id)} />}
        {tab === 'money' && <MoneyPage events={events.money} onAdd={()=>setModal('money')} onDel={id=>delEvent('money',id)} />}
        {tab === 'chat'  && <ChatPage onAddEvent={addEvent} onDelEvent={delByTitle} />}
      </div>

      {/* Modal */}
      {modal && (
        <AddModal
          lane={modal}
          onClose={() => setModal(null)}
          onAdd={ev => { addEvent(modal, ev); setModal(null) }}
        />
      )}
    </div>
  )
}
