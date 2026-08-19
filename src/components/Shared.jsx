import { fmt, semaforoInfo } from '../utils/index';

// ---- PersonCard — avatar redondo com foto ou inicial ----
export function PersonCard({ nome, size = 56, getPhoto, style = {} }) {
  const photo = getPhoto ? getPhoto(nome) : null;
  const initials = nome
    ? nome.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div className="person-card-avatar" style={{ width: size, height: size, ...style }}>
      {photo
        ? <img src={photo} alt={nome}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}/>
        : <span className="person-card-initial"
            style={{ fontSize: Math.max(14, size * 0.35) }}>{initials}</span>}
    </div>
  );
}

// ---- KPI Card ----
export function KpiCard({ icon, label, value, sub, gold }) {
  return (
    <div className={`kpi-card ${gold?'gold':''}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

// ---- Semáforo badge ----
export function Semaforo({ nivel }) {
  const info = semaforoInfo[nivel] || semaforoInfo.neutro;
  return (
    <span className="semaforo-badge" style={{ color: info.color, background: info.bg }}>
      {info.icon}
    </span>
  );
}

// ---- Alerta banner ----
export function AlertaBanner({ alertas }) {
  if (!alertas?.length) return null;
  return (
    <div className="alertas-wrap">
      {alertas.map((a, i) => (
        <div key={i} className={`alerta alerta-${a.nivel}`}>
          <span className="alerta-icon">{a.nivel==='vermelho'?'🔴':'🟡'}</span>
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ---- Barra de funil ----
export function FunilBar({ steps }) {
  const max = Math.max(...steps.map(s=>s.value), 1);
  return (
    <div className="funil">
      {steps.map((s, i) => {
        const taxa = i>0 && steps[i-1].value>0
          ? steps[i].value/steps[i-1].value : null;
        return (
          <div key={s.label} className="funil-step">
            <div className="funil-row">
              <span className="funil-label">{s.label}</span>
              <span className="funil-val" style={{color:s.color}}>
                {s.value}
                {s.crm && (s.crm.sf>0 || s.crm.blip>0) && (
                  <span className="funil-val-sub">
                    {' '}<span style={{color:'#f59e0b',fontWeight:700}}>SF {s.crm.sf}</span>
                    <span style={{opacity:.5}}> · </span>
                    <span style={{color:'#3b82f6',fontWeight:700}}>Blip {s.crm.blip}</span>
                  </span>
                )}
                {s.sub != null && !s.crm && (
                  <span className="funil-val-sub"> ({s.sub})</span>
                )}
              </span>
              {taxa!==null && <span className="funil-taxa">→ {fmt.pct(taxa)}</span>}
            </div>
            <div className="funil-bg">
              {s.segments ? (
                <div className="funil-fill-split" style={{width:`${(s.value/max)*100}%`, display:'flex', height:'100%', borderRadius:'inherit', overflow:'hidden'}}>
                  {s.segments.map((seg,si) => (
                    <div key={si}
                      title={`${seg.label}: ${seg.value}`}
                      style={{width:`${s.value>0?(seg.value/s.value)*100:0}%`, background:seg.color}} />
                  ))}
                </div>
              ) : (
                <div className="funil-fill" style={{width:`${(s.value/max)*100}%`, background:s.color}} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Mini barra vs média ----
export function MiniBar({ value, media, isPercent }) {
  const max = Math.max(value, media, 0.001);
  const wVal  = (value/max)*100;
  const wMed  = (media/max)*100;
  const label = isPercent ? fmt.pct(value) : fmt.int(value);
  return (
    <div className="minibar-wrap">
      <span className="minibar-label">{label}</span>
      <div className="minibar-track">
        <div className="minibar-val"  style={{width:`${wVal}%`}} />
        <div className="minibar-med"  style={{left:`${wMed}%`}} />
      </div>
    </div>
  );
}

// ---- Card container ----
export function Card({ title, children, className='' }) {
  return (
    <div className={`card ${className}`}>
      {title && <h3 className="card-title">{title}</h3>}
      {children}
    </div>
  );
}

// ---- Score ring ----
export function ScoreRing({ score }) {
  const r = 28, circ = 2*Math.PI*r;
  // score pode ser null ("Não iniciado" — SUP ainda sem cobrança). Sem isso o
  // anel renderiza "null" no meio do círculo.
  const s = Number.isFinite(score) ? score : null;
  const dash = ((s ?? 0)/100)*circ;
  const color = s === null ? '#6b7280' : s>=65?'#f59e0b':s>=35?'#60a5fa':'#f87171';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/>
      <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 36 36)"/>
      <text x="36" y="41" textAnchor="middle" fill={color}
        style={{fontSize:'14px',fontWeight:600,fontFamily:'inherit'}}>{s === null ? '—' : s}</text>
    </svg>
  );
}
