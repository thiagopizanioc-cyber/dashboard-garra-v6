import { useState } from 'react';

// Formata Date para string YYYY-MM-DD (input type=date)
function toInputDate(d) {
  if (!d) return '';
  const dd = new Date(d);
  return dd.toISOString().split('T')[0];
}

function fromInputDate(s) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

// Última data que aparece no CONTROLE (= último dia com registro)
function detectarUltimoPeriodo(raw) {
  if (!raw?.controle?.length) return null;
  const datas = raw.controle.map(r => r.data).filter(Boolean).sort((a,b) => b-a);
  const fim = datas[0] ? new Date(datas[0]) : new Date();
  fim.setHours(0,0,0,0);
  // Detecta período com pelo menos 1 registro (pega o bloco mais recente de 28 dias)
  const ini = new Date(fim);
  ini.setDate(fim.getDate() - 27);
  return { ini, fim };
}

export function DateRangePicker({ raw, ini, fim, onChange, calculating }) {
  const [localIni, setLocalIni] = useState(toInputDate(ini));
  const [localFim, setLocalFim] = useState(toInputDate(fim));

  function handleApply() {
    const i = fromInputDate(localIni);
    const f = fromInputDate(localFim);
    if (i && f && i <= f) onChange(i, f);
  }

  function handlePreset(label) {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    let i, f;
    if (label === '7d')  { f = new Date(hoje); i = new Date(hoje); i.setDate(f.getDate()-6); }
    if (label === '28d') { f = new Date(hoje); i = new Date(hoje); i.setDate(f.getDate()-27); }
    if (label === '30d') { f = new Date(hoje); i = new Date(hoje); i.setDate(f.getDate()-29); }
    if (label === 'mes') {
      i = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      f = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0);
    }
    if (label === 'ultimo' && raw) {
      const p = detectarUltimoPeriodo(raw);
      if (p) { i = p.ini; f = p.fim; }
    }
    if (i && f) {
      setLocalIni(toInputDate(i));
      setLocalFim(toInputDate(f));
      onChange(i, f);
    }
  }

  return (
    <div className="drp-wrap">
      <div className="drp-presets">
        <button className="drp-preset" onClick={() => handlePreset('ultimo')}>Último período</button>
        <button className="drp-preset" onClick={() => handlePreset('mes')}>Mês atual</button>
        <button className="drp-preset" onClick={() => handlePreset('28d')}>28 dias</button>
        <button className="drp-preset" onClick={() => handlePreset('7d')}>7 dias</button>
      </div>
      <div className="drp-inputs">
        <input type="date" className="drp-input" value={localIni}
          onChange={e => setLocalIni(e.target.value)}/>
        <span className="drp-sep">até</span>
        <input type="date" className="drp-input" value={localFim}
          onChange={e => setLocalFim(e.target.value)}/>
        <button className="drp-btn" onClick={handleApply} disabled={calculating}>
          {calculating ? '⏳' : '▶ Calcular'}
        </button>
      </div>
    </div>
  );
}
