import { useState } from 'react';
import { KpiCard, FunilBar, Card } from '../components/Shared';
import { fmt, statusCorretor, consolidar } from '../utils/index';

function TopRanking({ title, data, metrica, format, setPage, setTarget }) {
  const sorted = [...data].filter(c=>c[metrica]>0).sort((a,b)=>b[metrica]-a[metrica]).slice(0,5);
  return (
    <Card title={title}>
      {sorted.length===0 && <p className="empty">Sem dados no período</p>}
      {sorted.map((c,i)=>(
        <div key={c.corretor} className="top-row" onClick={()=>{setTarget({type:'corretor',nome:c.corretor,data:c});setPage('corretor');}}>
          <span className="top-pos">{i+1}</span>
          <div className="top-info">
            <span className="top-nome">{c.corretor}</span>
            <span className="top-sub">{c.gerente}</span>
          </div>
          <span className="top-val">{format(c[metrica])}</span>
        </div>
      ))}
    </Card>
  );
}

export function P1_Diretoria({ data, setPage, setTarget }) {
  const { corretores, media } = data;
  const total = consolidar(corretores);
  if (!total) return null;

  const periodo = corretores[0]?.dataInicio
    ? `${corretores[0].dataInicio} a ${corretores[0].dataFim}` : '';

  // Ranking por gerente
  const gerentesMap = {};
  corretores.forEach(c=>{
    if (!gerentesMap[c.gerente]) gerentesMap[c.gerente] = [];
    gerentesMap[c.gerente].push(c);
  });
  const rankGerentes = Object.entries(gerentesMap)
    .map(([g, lista])=>({ gerente:g, ...consolidar(lista) }))
    .sort((a,b)=>b.preVendas-a.preVendas).slice(0,5);

  const engaj = total.ativos>0 ? total.engajamento : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">🏛️ Visão Diretoria</h2>
          <div className="page-sub">Consolidado da operação {periodo && `· ${periodo}`}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid kpi-grid-6">
        <KpiCard icon="👥" label="Corretores"    value={`${total.ativos}/${total.total}`}   sub={`${total.total-total.ativos} sem registro`}/>
        <KpiCard icon="📞" label="Leads"          value={total.leads}   sub={`Média ${fmt.num(total.leads/Math.max(1,total.ativos),1)}/corretor`}/>
        <KpiCard icon="📅" label="Agendamentos"   value={total.agend}   sub={`Taxa ${fmt.pct(total.txLeadAgend)}`} gold/>
        <KpiCard icon="🏠" label="Visitas"        value={total.visitas} sub={`Taxa ${fmt.pct(total.txAgendVisita)}`} gold/>
        <KpiCard icon="🏆" label="Pré-Vendas"     value={total.preVendas} sub={`Conv. ${fmt.pct(total.txConv)}`} gold/>
        <KpiCard icon="⏰" label="Engajamento"    value={fmt.pct(engaj)} sub="Preenchimento em dia"/>
      </div>

      {/* Funil + Saúde */}
      <div className="row-2">
        <Card title="⚡ Funil da Empresa">
          <FunilBar steps={[
            {label:'Leads',       value:total.leads,     color:'#f59e0b'},
            {label:'Agendamentos',value:total.agend,     color:'#fb923c'},
            {label:'Visitas',     value:total.visitas,   color:'#f97316'},
            {label:'Pré-Vendas',  value:total.preVendas, color:'#ea580c'},
          ]}/>
        </Card>

        <Card title="🏢 Por Superintendência">
          {(() => {
            const superMap = {};
            corretores.forEach(c=>{
              if(!superMap[c.superintendente]) superMap[c.superintendente]=[];
              superMap[c.superintendente].push(c);
            });
            return Object.entries(superMap).map(([s,lista])=>{
              const cons = consolidar(lista);
              return (
                <div key={s} className="super-row" onClick={()=>{setTarget({type:'super',nome:s});setPage('super');}}>
                  <div>
                    <div className="super-nome">{s||'—'}</div>
                    <div className="super-sub">{cons.ativos}/{cons.total} ativos</div>
                  </div>
                  <div className="super-stats">
                    <span>📅 {cons.agend}</span>
                    <span>🏠 {cons.visitas}</span>
                    <span className={cons.preVendas>0?'val-gold':''}>🏆 {cons.preVendas}</span>
                  </div>
                </div>
              );
            });
          })()}
        </Card>
      </div>

      {/* Top Rankings */}
      <div className="row-3">
        <TopRanking title="🥇 Top Pré-Vendas"   data={corretores} metrica="preVendas"      format={fmt.int} setPage={setPage} setTarget={setTarget}/>
        <TopRanking title="📅 Top Agendamentos" data={corretores} metrica="agendForm2"     format={fmt.int} setPage={setPage} setTarget={setTarget}/>
        <TopRanking title="📊 Top Conversão"    data={corretores} metrica="taxaVisitaConv" format={v=>fmt.pct(v)} setPage={setPage} setTarget={setTarget}/>
      </div>

      {/* Top Gerentes */}
      <Card title="👥 Ranking de Gerentes">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr>
              <th>#</th><th>Gerente</th><th>Corretores</th>
              <th>Agend.</th><th>Visitas</th><th>Pré-Vendas</th>
              <th>Conv.</th><th>Engaj.</th>
            </tr></thead>
            <tbody>
              {rankGerentes.map((g,i)=>(
                <tr key={g.gerente} className="clickable" onClick={()=>{setTarget({type:'gerente',nome:g.gerente});setPage('gerencia');}}>
                  <td className="td-rank">{i+1}</td>
                  <td className="td-nome">{g.gerente}</td>
                  <td>{g.ativos}/{g.total}</td>
                  <td>{g.agend}</td>
                  <td>{g.visitas}</td>
                  <td className={g.preVendas>0?'val-gold':''}>{g.preVendas}</td>
                  <td>{fmt.pct(g.txConv)}</td>
                  <td>{fmt.pct(g.engajamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
