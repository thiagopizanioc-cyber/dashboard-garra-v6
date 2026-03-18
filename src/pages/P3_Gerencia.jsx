import { useState } from 'react';
import { KpiCard, Card, AlertaBanner, Semaforo, FunilBar, ScoreRing, PersonCard } from '../components/Shared';
import { RelatorioGrupoModal } from '../components/RelatorioGrupoModal';
import { SinoAlertas } from '../components/VendasExternas';
import { fmt, consolidar, semaforo, semaforoInfo, pontosDeAtencao, statusCorretor, topCanais } from '../utils/index';

const METRICAS_COLS = [
  { key:'diasTrabalhados', label:'Dias', pct:false },
  { key:'antes20h',        label:'≤20h', pct:false },
  { key:'leads',           label:'Leads', pct:false },
  { key:'agendForm2',      label:'Agend.', pct:false },
  { key:'visitasForm3',    label:'Visitas', pct:false },
  { key:'propostas',       label:'Proposta', pct:false },
  { key:'preVendas',       label:'Pré-Venda', pct:false },
  { key:'vendaSV',         label:'Venda SV', pct:false },
  { key:'taxaLeadAgend',   label:'L→Ag', pct:true },
  { key:'taxaVisitaConv',  label:'Conv.', pct:true },
  { key:'noShow',          label:'No-Show', pct:true, inv:true },
];

function CorretorModal({ c, media, controle, onClose, onViewFull }) {
  const st = statusCorretor(c);
  const engaj = c.diasTrabalhados>0 ? (c.antes20h+c.ate00h)/c.diasTrabalhados : 0;
  const padroes = controle?.[c.corretor]?.padroes || [];
  const topAg = topCanais(c.canaisAg);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-header-left">
            <ScoreRing score={st.score}/>
            <div>
              <div className="modal-nome">{c.corretor}</div>
              <div className="modal-sub">{c.gerente} · {c.superintendente}</div>
              <span className="badge" style={{color:st.color,background:st.bg}}>{st.label}</span>
            </div>
          </div>
          <button className="btn-primary" onClick={onViewFull}>Ver perfil completo →</button>
        </div>

        <div className="modal-grid-2">
          {/* Disciplina */}
          <div className="modal-section">
            <div className="section-title">⏰ Disciplina</div>
            <div className="mrow"><span>Dias trabalhados</span><span>{c.diasTrabalhados}</span></div>
            <div className="mrow"><span>Folgas</span><span>{c.folgas}</span></div>
            <div className="mrow"><span>Antes 20h</span><span>{c.antes20h}</span></div>
            <div className="mrow"><span>Engajamento</span>
              <span style={{color: engaj>=0.8?'#34d399':engaj>=0.5?'#fbbf24':'#f87171'}}>{fmt.pct(engaj)}</span>
            </div>
            <div className="mrow"><span>🔥 Streak</span>
              <span className="streak-val">{c.streak} dias</span>
            </div>
            {padroes.length>0 && (
              <div className="padroes-wrap">
                {padroes.map((p,i)=><div key={i} className="padrao">⚠️ {p}</div>)}
              </div>
            )}
          </div>

          {/* Performance */}
          <div className="modal-section">
            <div className="section-title">🏆 Performance</div>
            <div className="mrow"><span>Leads</span>
              <span>{c.leads} <small className="vs-media">vs {fmt.num(media.leads,1)}</small></span></div>
            <div className="mrow"><span>Agendamentos</span>
              <span>{c.agendForm2} <small className="vs-media">vs {fmt.num(media.agendForm2,1)}</small></span></div>
            <div className="mrow"><span>Visitas</span>
              <span>{c.visitasForm3} <small className="vs-media">vs {fmt.num(media.visitasForm3,1)}</small></span></div>
            <div className="mrow"><span>Pré-Vendas</span>
              <span className={c.preVendas>0?'val-gold':''}>{c.preVendas}</span></div>
            <div className="mrow"><span>Tx Conversão</span><span>{fmt.pct(c.taxaVisitaConv)}</span></div>
            <div className="mrow"><span>No-Show</span>
              <span style={{color:c.noShow>0.2?'#f87171':'inherit'}}>{fmt.pct(c.noShow)}</span></div>
          </div>
        </div>

        {/* Funil mini */}
        <FunilBar steps={[
          {label:'Leads',     value:c.leads,        color:'#f59e0b'},
          {label:'Agend.',    value:c.agendForm2,   color:'#fb923c'},
          {label:'Visitas',   value:c.visitasForm3, color:'#f97316'},
          {label:'Pré-Venda', value:c.preVendas,    color:'#ea580c'},
        ]}/>

        {topAg.length>0 && (
          <div style={{marginTop:16}}>
            <div className="section-title" style={{marginBottom:8}}>📡 Top canais de agendamento</div>
            {topAg.map(([canal,v])=>(
              <div key={canal} className="canal-row">
                <span>{canal}</span>
                <div className="canal-bar-bg"><div className="canal-bar-fill" style={{width:`${v*100}%`}}/></div>
                <span>{fmt.pct(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function P3_Gerencia({ data, controle, target, setTarget, setPage, getPhoto,
                              vendas, alertasRastreabilidade }) {
  const { corretores, gerentes, media } = data;
  const [selected, setSelected] = useState(target?.nome || gerentes[0] || '');
  const [modalCorretor, setModalCorretor] = useState(null);
  const [showRelatorio, setShowRelatorio] = useState(false);

  const listaGerente = corretores.filter(c=>c.gerente===selected);
  const cons = consolidar(listaGerente);
  const alertas = pontosDeAtencao(listaGerente, media);

  // Alertas de rastreabilidade filtrados para esta gerência
  const alertasGerencia = alertasRastreabilidade?.filter(a =>
    listaGerente.some(c => c.corretor === a.corretor)
  ) || [];

  // Vendas SV externas para esta gerência
  const svExt = vendas
    ? listaGerente.reduce((s,c) => s+(vendas[c.corretor]?.vendaSV||0), 0)
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-person">
          <PersonCard nome={selected} size={56} getPhoto={getPhoto}/>
          <div>
            <h2 className="page-title">👥 Gerência</h2>
            <div className="page-sub">Diagnóstico da equipe · Clique num corretor para detalhes rápidos</div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <SinoAlertas alertas={alertasGerencia}/>
          <button className="btn-relatorio" onClick={()=>setShowRelatorio(true)}>
            📄 Gerar Relatório
          </button>
          <select className="select-hero" value={selected}
            onChange={e=>setSelected(e.target.value)}>
            {gerentes.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {cons && (
        <div className="kpi-grid kpi-grid-6">
          <KpiCard icon="👥" label="Corretores"    value={`${cons.ativos}/${cons.total}`} sub={`${cons.total-cons.ativos} sem dados`}/>
          <KpiCard icon="📞" label="Leads"          value={cons.leads}/>
          <KpiCard icon="📅" label="Agendamentos"   value={cons.agend}    sub={fmt.pct(cons.txLeadAgend)} gold/>
          <KpiCard icon="🏠" label="Visitas"        value={cons.visitas}  sub={fmt.pct(cons.txAgendVisita)} gold/>
          <KpiCard icon="📝" label="Proposta"       value={cons.propostas||0} sub="Intenção de compra"/>
          <KpiCard icon="🏆" label="Pré-Venda"      value={cons.preVendas} sub={`Venda SV: ${svExt !== null ? svExt : (cons.vendaSV||0)}`} gold/>
        </div>
      )}

      <AlertaBanner alertas={alertas}/>

      {/* Tabela de corretores com semáforos */}
      <Card title={`🔍 Corretores — ${selected} · Semáforo vs média do time`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Corretor</th>
                {METRICAS_COLS.map(m=><th key={m.key}>{m.label}</th>)}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Linha da Média */}
              <tr className="tr-media">
                <td className="td-nome">📊 Média do Time</td>
                {METRICAS_COLS.map(m=>(
                  <td key={m.key}>
                    <span className="media-val">
                      {m.pct ? fmt.pct(media[m.key]) : fmt.num(media[m.key],1)}
                    </span>
                  </td>
                ))}
                <td>—</td>
              </tr>
              {listaGerente.sort((a,b)=>b.preVendas-a.preVendas).map(c=>{
                const st = statusCorretor(c);
                return (
                  <tr key={c.corretor} className="clickable" onClick={()=>setModalCorretor(c)}>
                    <td>
                      <div className="td-person">
                        <PersonCard nome={c.corretor} size={32} getPhoto={getPhoto}/>
                        <span className="td-nome" translate="no">{c.corretor}</span>
                      </div>
                    </td>
                    {METRICAS_COLS.map(m=>{
                      const val = c[m.key];
                      const nv = semaforo(val, media[m.key], m.inv);
                      return (
                        <td key={m.key}>
                          <div className="cell-sem">
                            <Semaforo nivel={nv}/>
                            <span>{m.pct ? fmt.pct(val) : fmt.int(val)}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td><span className="badge" style={{color:st.color,background:st.bg}}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="legenda">
          <span>🟢 Acima de 80% da média</span>
          <span>🟡 Entre 40-80%</span>
          <span>🔴 Abaixo de 40% (ou zero)</span>
        </div>
      </Card>

      {/* Modal rápido do corretor */}
      {modalCorretor && (
        <CorretorModal
          c={modalCorretor}
          media={media}
          controle={controle}
          onClose={()=>setModalCorretor(null)}
          onViewFull={()=>{
            setTarget({type:'corretor', nome:modalCorretor.corretor, data:modalCorretor});
            setPage('corretor');
            setModalCorretor(null);
          }}
        />
      )}

      {showRelatorio && (
        <RelatorioGrupoModal
          tipo="Gerência"
          nome={selected}
          lista={listaGerente}
          getPhoto={getPhoto}
          onClose={()=>setShowRelatorio(false)}
        />
      )}
    </div>
  );
}
