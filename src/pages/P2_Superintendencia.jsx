import { useState } from 'react';
import { KpiCard, Card, FunilBar, AlertaBanner, Semaforo, PersonCard } from '../components/Shared';
import { RelatorioGrupoModal } from '../components/RelatorioGrupoModal';
import { fmt, consolidar, semaforo, pontosDeAtencao } from '../utils/index';

export function P2_Superintendencia({ data, target, setTarget, setPage, getPhoto }) {
  const { corretores, supers, media } = data;
  const [selected, setSelected] = useState(target?.nome || supers[0] || '');
  const [showRelatorio, setShowRelatorio] = useState(false);

  const listaSuper = corretores.filter(c => c.superintendente === selected);
  const cons = consolidar(listaSuper);

  const gerentesMap = {};
  listaSuper.forEach(c => {
    if (!gerentesMap[c.gerente]) gerentesMap[c.gerente] = [];
    gerentesMap[c.gerente].push(c);
  });

  const alertas = pontosDeAtencao(listaSuper, media);

  const metricas = [
    { key:'agend',       label:'Agend.',    fn:c=>c.agendForm2 },
    { key:'visitas',     label:'Visitas',   fn:c=>c.visitasForm3 },
    { key:'preVendas',   label:'Pré-Venda', fn:c=>c.preVendas },
    { key:'txConv',      label:'Conv.',     fn:c=>c.txConv, pct:true },
    { key:'engajamento', label:'Engaj.',    fn:c=>c.diasTrabalhados>0?(c.antes20h+c.ate00h)/c.diasTrabalhados:0, pct:true },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-person">
          <PersonCard nome={selected} size={56} getPhoto={getPhoto}/>
          <div>
            <h2 className="page-title">🏢 Superintendência</h2>
            <div className="page-sub">Raio-X da equipe e das gerências</div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <button className="btn-relatorio" onClick={()=>setShowRelatorio(true)}>
            📄 Gerar Relatório
          </button>
          <select className="select-hero" value={selected} onChange={e => setSelected(e.target.value)}>
            {supers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {!cons ? <p className="empty">Sem dados para esta superintendência.</p> : <>

        <div className="kpi-grid kpi-grid-5">
          <KpiCard icon="👥" label="Corretores"  value={`${cons.ativos}/${cons.total}`} sub={`${cons.total-cons.ativos} sem registro`}/>
          <KpiCard icon="📞" label="Leads"        value={cons.leads}    sub={`Repiks: ${cons.repiks}`}/>
          <KpiCard icon="📅" label="Agendamentos" value={cons.agend}    sub={`Taxa ${fmt.pct(cons.txLeadAgend)}`} gold/>
          <KpiCard icon="🏠" label="Visitas"      value={cons.visitas}  sub={`Taxa ${fmt.pct(cons.txAgendVisita)}`} gold/>
          <KpiCard icon="🏆" label="Pré-Vendas"   value={cons.preVendas} sub={`Conv. ${fmt.pct(cons.txConv)}`} gold/>
        </div>

        <AlertaBanner alertas={alertas}/>

        <div className="row-2">
          <Card title="⚡ Funil da Superintendência">
            <FunilBar steps={[
              {label:'Leads',       value:cons.leads,     color:'#f59e0b'},
              {label:'Agendamentos',value:cons.agend,     color:'#fb923c'},
              {label:'Visitas',     value:cons.visitas,   color:'#f97316'},
              {label:'Pré-Vendas',  value:cons.preVendas, color:'#ea580c'},
            ]}/>
          </Card>

          <Card title="⏰ Engajamento por Gerência">
            {Object.entries(gerentesMap).map(([g, lista]) => {
              const ativos = lista.filter(c => c.diasTrabalhados > 0);
              const engaj = ativos.length
                ? ativos.reduce((s,c) => s + (c.antes20h+c.ate00h)/c.diasTrabalhados, 0) / ativos.length : 0;
              const pct = Math.round(engaj * 100);
              const semDados = lista.filter(c => c.diasTrabalhados === 0);
              return (
                <div key={g} className="engaj-row">
                  <div className="engaj-header">
                    <div className="engaj-header-left">
                      <PersonCard nome={g} size={30} getPhoto={getPhoto}/>
                      <span className="engaj-nome" translate="no">{g}</span>
                    </div>
                    <span className="engaj-pct"
                      style={{color: pct>=80?'#34d399':pct>=50?'#fbbf24':'#f87171'}}>{pct}%</span>
                  </div>
                  <div className="engaj-bar-bg">
                    <div className="engaj-bar-fill"
                      style={{width:`${pct}%`, background: pct>=80?'#34d399':pct>=50?'#fbbf24':'#f87171'}}/>
                  </div>
                  {semDados.length > 0 && (
                    <div className="engaj-warn" translate="no">⚠️ Sem dados: {semDados.map(c=>c.corretor).join(', ')}</div>
                  )}
                </div>
              );
            })}
          </Card>
        </div>

        <Card title="👥 Comparativo de Gerências">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>
                <th>Gerente</th>
                <th>Corretores</th>
                {metricas.map(m => <th key={m.key}>{m.label}</th>)}
                <th>Ação</th>
              </tr></thead>
              <tbody>
                {Object.entries(gerentesMap).sort((a,b) => {
                  const ca=consolidar(a[1]), cb=consolidar(b[1]);
                  return cb.preVendas - ca.preVendas;
                }).map(([g, lista]) => {
                  const c = consolidar(lista);
                  return (
                    <tr key={g}>
                      <td>
                        <div className="td-person">
                          <PersonCard nome={g} size={32} getPhoto={getPhoto}/>
                          <span className="td-nome" translate="no">{g}</span>
                        </div>
                      </td>
                      <td>{c.ativos}/{c.total}</td>
                      {metricas.map(m => {
                        const val = m.fn({...c});
                        const nv = semaforo(val, media[m.key]||0, false);
                        return (
                          <td key={m.key}>
                            <div className="cell-sem">
                              <Semaforo nivel={nv}/>
                              <span>{m.pct ? fmt.pct(val) : fmt.int(val)}</span>
                            </div>
                          </td>
                        );
                      })}
                      <td>
                        <button className="btn-sm"
                          onClick={() => { setTarget({type:'gerente',nome:g}); setPage('gerencia'); }}>
                          Ver equipe →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </>}

      {showRelatorio && (
        <RelatorioGrupoModal
          tipo="Superintendência"
          nome={selected}
          lista={listaSuper}
          getPhoto={getPhoto}
          onClose={() => setShowRelatorio(false)}
        />
      )}
    </div>
  );
}
