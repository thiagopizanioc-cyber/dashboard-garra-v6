import { useState } from 'react';
import { Card, Semaforo } from '../components/Shared';
import { fmt, consolidar, semaforo } from '../utils/index';

const TIPOS = ['Corretor','Gerente','Superintendência'];

const METRICAS = [
  { key:'diasTrabalhados',label:'Dias trabalhados',   pct:false },
  { key:'leads',          label:'Leads',              pct:false },
  { key:'agendForm2',     label:'Agendamentos',       pct:false },
  { key:'visitasForm3',   label:'Visitas',            pct:false },
  { key:'preVendas',      label:'Pré-Vendas',         pct:false },
  { key:'taxaLeadAgend',  label:'Taxa Lead→Agend',    pct:true  },
  { key:'taxaAgendVisita',label:'Taxa Agend→Visita',  pct:true  },
  { key:'taxaVisitaConv', label:'Taxa Conversão',     pct:true  },
  { key:'noShow',         label:'No-Show',            pct:true, inv:true },
  { key:'folgas',         label:'Folgas',             pct:false, inv:true },
  { key:'engajamento',    label:'Engajamento',        pct:true  },
  { key:'repiks',         label:'Repiks',             pct:false },
  { key:'tempoDiscador',  label:'Discador (min)',      pct:false },
];

function getOpcoes(tipo, data) {
  const { corretores } = data;
  if (tipo==='Corretor') return [...new Set(corretores.map(c=>c.corretor))].filter(Boolean).sort();
  if (tipo==='Gerente')  return [...new Set(corretores.map(c=>c.gerente))].filter(Boolean).sort();
  return [...new Set(corretores.map(c=>c.superintendente))].filter(Boolean).sort();
}

function getMetricas(tipo, nome, data) {
  const { corretores } = data;
  let lista;
  if (tipo==='Corretor')        lista = corretores.filter(c=>c.corretor===nome);
  else if (tipo==='Gerente')    lista = corretores.filter(c=>c.gerente===nome);
  else                          lista = corretores.filter(c=>c.superintendente===nome);

  if (!lista.length) return null;
  if (tipo==='Corretor') {
    const c = lista[0];
    const engaj = c.diasTrabalhados>0 ? (c.antes20h+c.ate00h)/c.diasTrabalhados : 0;
    return { ...c, engajamento: engaj };
  }
  const cons = consolidar(lista);
  return { ...cons,
    diasTrabalhados: Math.round(cons.ativos>0 ? lista.reduce((s,c)=>s+c.diasTrabalhados,0)/lista.length : 0),
    leads: cons.leads, agendForm2: cons.agend, visitasForm3: cons.visitas, preVendas: cons.preVendas,
    taxaLeadAgend: cons.txLeadAgend, taxaAgendVisita: cons.txAgendVisita, taxaVisitaConv: cons.txConv,
    noShow: lista.reduce((s,c)=>s+c.noShow,0)/Math.max(1,lista.length),
    folgas: lista.reduce((s,c)=>s+c.folgas,0),
    repiks: cons.repiks, tempoDiscador: cons.tempoDiscador,
  };
}

export function P5_Arena({ data }) {
  const [tipo, setTipo] = useState('Corretor');
  const [esq, setEsq]   = useState('');
  const [dir, setDir]   = useState('');

  const opcoes = getOpcoes(tipo, data);
  const mEsq   = esq ? getMetricas(tipo, esq, data) : null;
  const mDir   = dir ? getMetricas(tipo, dir, data) : null;

  function vencedor(m, inv) {
    if (!mEsq||!mDir) return null;
    const ve = mEsq[m]??0, vd = mDir[m]??0;
    if (ve===vd) return 'empate';
    if (inv) return ve<vd ? 'esq' : 'dir';
    return ve>vd ? 'esq' : 'dir';
  }

  let placar = {esq:0, dir:0, empate:0};
  if (mEsq && mDir) {
    METRICAS.forEach(m=>{
      const v = vencedor(m.key, m.inv);
      if (v==='esq') placar.esq++;
      else if (v==='dir') placar.dir++;
      else placar.empate++;
    });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">⚡ Arena de Comparativos</h2>
          <div className="page-sub">Head-to-head · Cruzamento de dados lado a lado</div>
        </div>
      </div>

      {/* Seletores */}
      <Card>
        <div className="arena-controls">
          <div className="arena-tipo">
            {TIPOS.map(t=>(
              <button key={t} className={`btn-tipo ${tipo===t?'active':''}`}
                onClick={()=>{setTipo(t);setEsq('');setDir('');}}>
                {t}
              </button>
            ))}
          </div>
          <div className="arena-selects">
            <select className="select-hero" value={esq} onChange={e=>setEsq(e.target.value)}>
              <option value="">— Selecione A —</option>
              {opcoes.filter(o=>o!==dir).map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <div className="arena-vs">VS</div>
            <select className="select-hero" value={dir} onChange={e=>setDir(e.target.value)}>
              <option value="">— Selecione B —</option>
              {opcoes.filter(o=>o!==esq).map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {mEsq && mDir && (
        <>
          {/* Placar */}
          <div className="placar-row">
            <div className="placar-lado">
              <div className="placar-nome">{esq}</div>
              <div className="placar-pts" style={{color:'#f59e0b'}}>{placar.esq}</div>
              <div className="placar-sub">vitórias</div>
            </div>
            <div className="placar-center">
              <div className="placar-empate">{placar.empate} empates</div>
            </div>
            <div className="placar-lado">
              <div className="placar-nome">{dir}</div>
              <div className="placar-pts" style={{color:'#60a5fa'}}>{placar.dir}</div>
              <div className="placar-sub">vitórias</div>
            </div>
          </div>

          {/* Tabela de métricas */}
          <Card title="📊 Comparativo métrica por métrica">
            <div className="table-wrap">
              <table className="data-table arena-table">
                <thead>
                  <tr>
                    <th style={{color:'#f59e0b', textAlign:'right'}}>{esq}</th>
                    <th style={{textAlign:'center'}}>Métrica</th>
                    <th style={{color:'#60a5fa'}}>{dir}</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICAS.map(m=>{
                    const ve = mEsq[m.key]??0;
                    const vd = mDir[m.key]??0;
                    const v = vencedor(m.key, m.inv);
                    const fmt_ = m.pct ? fmt.pct : fmt.int;
                    return (
                      <tr key={m.key}>
                        <td style={{textAlign:'right'}}>
                          <span className={v==='esq'?'arena-win':''}>
                            {v==='esq' && '🏆 '}{fmt_(ve)}
                          </span>
                        </td>
                        <td style={{textAlign:'center', color:'var(--text-faint)', fontSize:'12px'}}>
                          {m.label}
                        </td>
                        <td>
                          <span className={v==='dir'?'arena-win':''}>
                            {v==='dir' && '🏆 '}{fmt_(vd)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {(!esq||!dir) && (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <div>Selecione dois {tipo.toLowerCase()}s para comparar</div>
        </div>
      )}
    </div>
  );
}
